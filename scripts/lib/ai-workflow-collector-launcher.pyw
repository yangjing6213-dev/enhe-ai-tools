"""Run a scheduled console command without a window; own its process tree.

Usage: pythonw.exe launcher.pyw <absolute-config.json>
Config keys: executable, arguments, workingDirectory.
No third-party packages, shell expansion, or credential reads are used.
"""
import ctypes
from ctypes import wintypes
import datetime
import json
import os
from pathlib import Path
import sys

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
SIZE_T = ctypes.c_size_t
ULONG_PTR = ctypes.c_size_t


class STARTUPINFOW(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD), ("lpReserved", wintypes.LPWSTR),
        ("lpDesktop", wintypes.LPWSTR), ("lpTitle", wintypes.LPWSTR),
        ("dwX", wintypes.DWORD), ("dwY", wintypes.DWORD),
        ("dwXSize", wintypes.DWORD), ("dwYSize", wintypes.DWORD),
        ("dwXCountChars", wintypes.DWORD), ("dwYCountChars", wintypes.DWORD),
        ("dwFillAttribute", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
        ("wShowWindow", wintypes.WORD), ("cbReserved2", wintypes.WORD),
        ("lpReserved2", ctypes.POINTER(ctypes.c_byte)),
        ("hStdInput", wintypes.HANDLE), ("hStdOutput", wintypes.HANDLE),
        ("hStdError", wintypes.HANDLE),
    ]


class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [("hProcess", wintypes.HANDLE), ("hThread", wintypes.HANDLE),
                ("dwProcessId", wintypes.DWORD), ("dwThreadId", wintypes.DWORD)]


class BASIC_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong),
        ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", wintypes.DWORD),
        ("MinimumWorkingSetSize", SIZE_T), ("MaximumWorkingSetSize", SIZE_T),
        ("ActiveProcessLimit", wintypes.DWORD), ("Affinity", ULONG_PTR),
        ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD),
    ]


class IO_COUNTERS(ctypes.Structure):
    _fields_ = [(name, ctypes.c_ulonglong) for name in (
        "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
        "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]


class EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", BASIC_LIMIT_INFORMATION),
        ("IoInfo", IO_COUNTERS),
        ("ProcessMemoryLimit", SIZE_T), ("JobMemoryLimit", SIZE_T),
        ("PeakProcessMemoryUsed", SIZE_T), ("PeakJobMemoryUsed", SIZE_T),
    ]


kernel32.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
kernel32.CreateJobObjectW.restype = wintypes.HANDLE
kernel32.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
kernel32.SetInformationJobObject.restype = wintypes.BOOL
kernel32.CreateProcessW.argtypes = [
    wintypes.LPCWSTR, wintypes.LPWSTR, ctypes.c_void_p, ctypes.c_void_p,
    wintypes.BOOL, wintypes.DWORD, ctypes.c_void_p, wintypes.LPCWSTR,
    ctypes.POINTER(STARTUPINFOW), ctypes.POINTER(PROCESS_INFORMATION),
]
kernel32.CreateProcessW.restype = wintypes.BOOL
kernel32.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
kernel32.AssignProcessToJobObject.restype = wintypes.BOOL
kernel32.ResumeThread.argtypes = [wintypes.HANDLE]
kernel32.ResumeThread.restype = wintypes.DWORD
kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
kernel32.WaitForSingleObject.restype = wintypes.DWORD
kernel32.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
kernel32.GetExitCodeProcess.restype = wintypes.BOOL
kernel32.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
kernel32.TerminateProcess.restype = wintypes.BOOL
kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.CloseHandle.restype = wintypes.BOOL
kernel32.ExitProcess.argtypes = [wintypes.UINT]
kernel32.ExitProcess.restype = None


def check(ok, operation):
    if not ok:
        raise OSError(ctypes.get_last_error(), operation)


def run():
    job = None
    process = PROCESS_INFORMATION()
    stage = "configuration"
    try:
        if len(sys.argv) != 2 or not os.path.isabs(sys.argv[1]):
            raise ValueError("absolute config path required")
        with open(sys.argv[1], encoding="utf-8-sig") as source:
            config = json.load(source)
        executable = config["executable"]
        arguments = config["arguments"]
        directory = config["workingDirectory"]
        if not all(isinstance(value, str) and "\0" not in value for value in (executable, arguments, directory)):
            raise ValueError("invalid config fields")
        if not os.path.isabs(executable) or '"' in executable or not os.path.isfile(executable):
            raise ValueError("invalid executable")
        if not os.path.isabs(directory) or not os.path.isdir(directory):
            raise ValueError("invalid working directory")
        command = ctypes.create_unicode_buffer('"' + executable + '" ' + arguments)

        stage = "CreateJobObjectW"
        job = kernel32.CreateJobObjectW(None, None)
        check(job, stage)
        limits = EXTENDED_LIMIT_INFORMATION()
        limits.BasicLimitInformation.LimitFlags = 0x00002000  # KILL_ON_JOB_CLOSE
        stage = "SetInformationJobObject"
        check(kernel32.SetInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits)), stage)

        startup = STARTUPINFOW()
        startup.cb = ctypes.sizeof(startup)
        stage = "CreateProcessW"
        check(kernel32.CreateProcessW(
            executable, command, None, None, False,
            0x08000000 | 0x00000004,  # CREATE_NO_WINDOW | CREATE_SUSPENDED
            None, directory, ctypes.byref(startup), ctypes.byref(process)), stage)
        stage = "AssignProcessToJobObject"
        check(kernel32.AssignProcessToJobObject(job, process.hProcess), stage)
        stage = "ResumeThread"
        check(kernel32.ResumeThread(process.hThread) != 0xFFFFFFFF, stage)
        kernel32.CloseHandle(process.hThread)
        process.hThread = None
        stage = "WaitForSingleObject"
        check(kernel32.WaitForSingleObject(process.hProcess, 0xFFFFFFFF) == 0, stage)
        code = wintypes.DWORD()
        stage = "GetExitCodeProcess"
        check(kernel32.GetExitCodeProcess(process.hProcess, ctypes.byref(code)), stage)
        return code.value
    except Exception as error:
        # Never leave a suspended/unmanaged child behind on a setup failure.
        if process.hProcess:
            kernel32.TerminateProcess(process.hProcess, 125)
            kernel32.WaitForSingleObject(process.hProcess, 5000)
        try:
            stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            with Path(__file__).with_name("launcher-error.log").open("a", encoding="utf-8") as log:
                log.write("{} stage={} error={} code={}\n".format(stamp, stage, type(error).__name__, getattr(error, "errno", None)))
        except OSError:
            pass
        return 125
    finally:
        if process.hThread:
            kernel32.CloseHandle(process.hThread)
        if job:
            # The handle is non-inheritable; killing this launcher also closes it.
            kernel32.CloseHandle(job)
        if process.hProcess:
            kernel32.CloseHandle(process.hProcess)


if __name__ == "__main__":
    kernel32.ExitProcess(run())
