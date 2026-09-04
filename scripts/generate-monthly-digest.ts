 import { PrismaClient } from "@prisma/client";
 import nodemailer from "nodemailer";
 import "dotenv/config";
 
 const prisma = new PrismaClient();
 
 function truncate(text: string, maxLen: number) {
   if (!text) return "";
   return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
 }
 
 function formatPrice(price: unknown) {
   const value = Number(price ?? 0);
   return Number.isFinite(value) && value > 0 ? `\u00a5${value.toFixed(2)}` : "\u514d\u8d39";
 }
 
 async function getPrimaryPrice(priceSpecs: { price: unknown; status: string }[], downloadPrice: unknown) {
   const active = priceSpecs.filter((s) => s.status === "active" && Number(s.price) > 0);
   if (active.length) return active.sort((a, b) => Number(a.price) - Number(b.price))[0].price;
   return Number(downloadPrice ?? 0) > 0 ? downloadPrice : 0;
 }

 function buildToolPublicPath(tool: { slug: string; type: "software" | "online" | "skill_learning" }) {
   const basePath = tool.type === "online" ? "/account-services" : tool.type === "skill_learning" ? "/skill-learning" : "/software";
   return `${basePath}/${tool.slug}`;
 }
 
 function buildToolCard(tool: {
   name: string;
   englishName?: string | null;
   slug: string;
   type: "software" | "online" | "skill_learning";
   shortDescription: string;
   content: string;
   priceSpecs: { price: unknown; status: string }[];
   downloadPrice: unknown;
 }) {
   const detail = truncate(tool.shortDescription, 80);
   const pain = truncate(tool.content.replace(/<[^>]+>/g, ""), 120);
   const link = `https://www.enhe-tech.com.cn${buildToolPublicPath(tool)}`;
 
   return `<tr>
     <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#F6FAFF;font-weight:600">${tool.name}${tool.englishName ? `<br><span style="font-size:12px;color:#7DD3FC;font-weight:400">${tool.englishName}</span>` : ""}</td>
      <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#C5D0E2;font-size:13px;line-height:1.6">${detail}</td>
     <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#8B95A7;font-size:12px;line-height:1.5">${pain}</td>
     <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08)"><a href="${link}" style="color:#7DD3FC;text-decoration:none;font-weight:600;white-space:nowrap">\u67e5\u770b\u8be6\u60c5 \u2192</a></td>
   </tr>`;
 }
 
 const tableHeader = `<tr style="background:rgba(125,211,252,0.06)">
   <th style="padding:10px 14px;text-align:left;color:#7DD3FC;font-size:12px;text-transform:uppercase">\u4ea7\u54c1\u540d\u79f0</th>
   <th style="padding:10px 14px;text-align:left;color:#7DD3FC;font-size:12px;text-transform:uppercase">\u6838\u5fc3\u529f\u80fd</th>
   <th style="padding:10px 14px;text-align:left;color:#7DD3FC;font-size:12px;text-transform:uppercase">\u89e3\u51b3\u7684\u95ee\u9898</th>
   <th style="padding:10px 14px;text-align:left;color:#7DD3FC;font-size:12px;text-transform:uppercase">\u8be6\u60c5</th>
 </tr>`;
 
 async function main() {
   const now = new Date();
   const monthLabel = `${now.getFullYear()}\u5e74${now.getMonth() + 1}\u6708`;
 
   // Prevent duplicate sends in same month
   const existingAudit = await prisma.adminAuditLog.findFirst({
     where: {
       action: "monthly_digest_sent",
       createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }
     }
   });
   if (existingAudit) {
     console.log("Monthly digest already sent this month. Skipping.");
     return;
   }
 
   // Fetch published tools grouped by type
   const [software, online, courses] = await Promise.all([
     prisma.tool.findMany({
       where: { type: "software", status: "published" },
       include: { priceSpecs: { where: { status: "active" } } },
       orderBy: { sortOrder: "asc" }
     }),
     prisma.tool.findMany({
       where: { type: "online", status: "published" },
       include: { priceSpecs: { where: { status: "active" } } },
       orderBy: { sortOrder: "asc" }
     }),
     prisma.tool.findMany({
       where: { type: "skill_learning", status: "published" },
       include: { priceSpecs: { where: { status: "active" } } },
       orderBy: { sortOrder: "asc" }
     })
   ]);
 
   // Get new products this month
   const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
   const [newSoftware, newOnline, newCourses] = await Promise.all([
     prisma.tool.count({ where: { type: "software", status: "published", createdAt: { gte: monthStart } } }),
     prisma.tool.count({ where: { type: "online", status: "published", createdAt: { gte: monthStart } } }),
     prisma.tool.count({ where: { type: "skill_learning", status: "published", createdAt: { gte: monthStart } } })
   ]);
   const totalNew = newSoftware + newOnline + newCourses;
   const totalAll = software.length + online.length + courses.length;
 
   function buildTableRow(tool: { name: string; englishName?: string | null; slug: string; description: string; content: string }) {
     // Use the same function but with a simplified tool interface
     return "";
   }
 
   let html = `<div style="max-width:800px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0A1020;color:#C5D0E2;padding:24px;border-radius:16px">
 <h1 style="color:#F6FAFF;font-size:24px;margin:0 0 8px">ENHE AI \u5de5\u4f5c\u5ba4 \u6700\u65b0\u4ea7\u54c1\u63a8\u8350 \u2014 ${monthLabel}</h1>
 <p style="color:#8B95A7;font-size:14px;margin:0 0 24px">\u60a8\u597d\uff0cENHE AI \u4e3a\u60a8\u63a8\u8350\u672c\u6708\u6700\u65b0\u4ea7\u54c1\uff1a</p>`;
 
   if (software.length) {
     html += `<h2 style="color:#7DD3FC;font-size:18px;margin:24px 0 12px">\ud83d\udda5\ufe0f AI\u8f6f\u4ef6\u5e94\u7528\uff08${software.length} \u6b3e\uff09</h2>
 <table style="width:100%;table-layout:fixed;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:12px;overflow:hidden">${tableHeader}
 ${software.map(buildToolCard).join("")}</table>`;
   }
 
   if (online.length) {
     html += `<h2 style="color:#7DD3FC;font-size:18px;margin:24px 0 12px">\ud83c\udf10 AI\u8d26\u53f7\u670d\u52a1\uff08${online.length} \u6b3e\uff09</h2>
 <table style="width:100%;table-layout:fixed;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:12px;overflow:hidden">${tableHeader}
 ${online.map(buildToolCard).join("")}</table>`;
   }
 
   if (courses.length) {
     html += `<h2 style="color:#7DD3FC;font-size:18px;margin:24px 0 12px">\ud83d\udcda AI\u6280\u80fd\u5b66\u4e60\uff08${courses.length} \u6b3e\uff09</h2>
 <table style="width:100%;table-layout:fixed;border-collapse:collapse;background:rgba(255,255,255,0.03);border-radius:12px;overflow:hidden">${tableHeader}
 ${courses.map(buildToolCard).join("")}</table>`;
   }
 
   html += `<div style="margin-top:28px;padding:16px;background:rgba(125,211,252,0.06);border-radius:12px">
 <p style="color:#F6FAFF;font-size:16px;margin:0 0 8px">\ud83d\udcc8 \u672c\u6708\u52a8\u6001</p>
 <p style="color:#8B95A7;font-size:14px;margin:0">\u672c\u6708\u4e0a\u67b6\u65b0\u54c1\uff1a${totalNew} \u6b3e \u00b7 \u5168\u90e8\u5728\u7ebf\u4ea7\u54c1\uff1a${totalAll} \u6b3e</p>
 <p style="color:#8B95A7;font-size:14px;margin:8px 0 0">\u67e5\u770b\u5168\u90e8\u4ea7\u54c1\uff1a<a href="https://www.enhe-tech.com.cn" style="color:#7DD3FC;text-decoration:none">www.enhe-tech.com.cn</a></p>
 </div>`;
 
   html += `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0">
 <p style="color:#8B95A7;font-size:12px;line-height:1.6">\u00a9 ${now.getFullYear()} ENHE AI<br>\u5982\u9700\u9000\u8ba2\uff0c\u8bf7\u767b\u5f55<a href="https://www.enhe-tech.com.cn/user" style="color:#7DD3FC;text-decoration:none">\u7528\u6237\u4e2d\u5fc3</a>\u5173\u95ed\u90ae\u4ef6\u63a8\u9001\u3002</p>
 </div>`;
 
   // Get subscribers
   const subscribers = await prisma.user.findMany({
     where: { acceptEmailUpdates: true, newsletterEmail: { not: null }, status: "active" },
     select: { id: true, newsletterEmail: true, nickname: true }
   });
 
   const adminEmails = (process.env.ADMIN_ALERT_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean);
 
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: Number(process.env.SMTP_PORT ?? 465),
     secure: process.env.SMTP_SECURE === "true",
     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
   });
 
   let sent = 0;
   const allRecipients = [
     ...subscribers.map(u => u.newsletterEmail!),
     ...adminEmails
   ].filter((v, i, a) => v && a.indexOf(v) === i); // unique
 
   for (const email of allRecipients) {
     try {
       await transporter.sendMail({
         from: process.env.SMTP_FROM,
         to: email,
         subject: `ENHE AI \u5de5\u4f5c\u5ba4 \u6700\u65b0\u4ea7\u54c1\u63a8\u8350 \u2014 ${monthLabel}`,
         html
       });
       sent++;
       console.log(`Sent to ${email}`);
     } catch (err) {
       console.error(`Failed to send to ${email}:`, err);
     }
   }
 
   await prisma.adminAuditLog.create({
     data: {
       action: "monthly_digest_sent",
       targetType: "email",
       summary: `${monthLabel} monthly digest sent to ${sent} recipients`,
       metadata: { sent, totalRecipients: allRecipients.length }
     }
   });
 
   console.log(`Monthly digest completed. Sent: ${sent}/${allRecipients.length}`);
   await prisma.$disconnect();
 }
 
 main().catch(async (err) => {
   console.error("Monthly digest failed:", err);
   await prisma.$disconnect();
   process.exit(1);
 });
