"use client";

import ProfileCard from "@/components/ProfileCard";
import type { Locale } from "@/lib/dictionaries";
import "./about-founder.css";

export function AboutFounder({ locale }: { locale: Locale }) {
  const english = locale === "en";
  return (
    <section className="about-founder" aria-labelledby="about-founder-title">
      <h2 id="about-founder-title">{english ? "Website Founder" : "网站创始人"}</h2>
      <div className="about-founder-layout">
        <ProfileCard
          className="about-founder-profile"
          name="Enhe（恩禾）"
          title={english ? "Product Designer · AI Builder" : "产品设计师 · AI Builder"}
          handle="Amenenhe_ai"
          status={english ? "Solo Builder" : "一人公司实践者"}
          contactText={english ? "Email" : "联系"}
          contactHref="mailto:amen.enhe@gmail.com"
          avatarUrl="/images/about/enhe-founder.webp"
          iconUrl="/images/about/enhe-founder-pattern.svg"
          holo={0.8}
          glare={0.5}
          tiltStrength={12}
          parallax={8}
          radius={16}
          enableTilt
          intro
          showUserInfo
          enableMobileTilt={false}
          theme="dark"
        />
        <div className="about-founder-copy">
          <p className="about-founder-role">{english ? "Product Designer / Solo Entrepreneur / AI Builder" : "产品设计师 / 一人公司实践者 / AI Builder"}</p>
          <h3>{english ? "Building a one-person business with AI." : "用 AI 打造一个人公司。"}</h3>
          <dl className="about-founder-contacts">
            <div><dt>GitHub</dt><dd><a href="https://github.com/yangjing6213-dev" target="_blank" rel="noopener noreferrer">yangjing6213-dev</a></dd></div>
            <div><dt>X / Twitter</dt><dd><a href="https://x.com/Amenenhe_ai" target="_blank" rel="noopener noreferrer">Amenenhe_ai</a></dd></div>
            <div><dt>{english ? "Website" : "网站"}</dt><dd><a href="https://www.enhe-tech.com.cn/">www.enhe-tech.com.cn</a></dd></div>
            <div><dt>{english ? "WeChat" : "微信"}</dt><dd>ENHE-AI</dd></div>
            <div><dt>{english ? "Email" : "邮箱"}</dt><dd><a href="mailto:amen.enhe@gmail.com">amen.enhe@gmail.com</a></dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
