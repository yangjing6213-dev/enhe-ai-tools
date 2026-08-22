# Sixty-Second Capacity Sampling

One CPU baseline preceded six sequential ten-second samples.

| Sample | CPU idle bps | Memory available bytes | Load5 milli | Swap in | Swap out | Production CPU bps | Production memory bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 9872 | 5838860288 | 240 | 0 | 0 | 71 | 565790998 |
| 2 | 9798 | 5811519488 | 260 | 7 | 0 | 12 | 567552606 |
| 3 | 9822 | 5795553280 | 270 | 5 | 0 | 182 | 569318408 |
| 4 | 9774 | 5781549056 | 280 | 3 | 0 | 129 | 571746910 |
| 5 | 9810 | 5789175808 | 310 | 0 | 0 | 92 | 574148149 |
| 6 | 9840 | 5823389696 | 330 | 1 | 0 | 167 | 587899175 |

```text
HOST_CPU_IDLE_MIN_BPS=9774
HOST_CPU_IDLE_AVG_BPS=9819
HOST_MEMORY_AVAILABLE_MIN_BYTES=5781549056
HOST_MEMORY_AVAILABLE_AVG_BYTES=5806674602
HOST_LOAD5_MAX_MILLI=330
HOST_SWAP_IN_TOTAL=16
HOST_SWAP_OUT_TOTAL=0
PRODUCTION_CPU_MAX_BPS=182
PRODUCTION_MEMORY_MAX_BYTES=587899175
```

`HOST_SWAP_IN_TOTAL` is the sum of kernel `pswpin` counter deltas across the six intervals. Its nonzero value is the only hard-capacity failure.
