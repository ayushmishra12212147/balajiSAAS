"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Smartphone,
  Cloud,
  Brain,
  GitBranch,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Sparkles,
  Code2,
  Zap,
  Shield,
} from "lucide-react";
import styles from "./home.module.css";

/* ────────────────────────────────────────
   Carousel Data
   ──────────────────────────────────────── */

const SLIDES = [
  {
    image: "/images/carousel/hero-software.png",
    tag: "Full-Stack Development",
    title: "Transform Ideas Into Powerful Digital Solutions",
    desc: "We design and develop enterprise-grade software tailored to your unique business needs — from concept to deployment and beyond.",
  },
  {
    image: "/images/carousel/web-dashboard.png",
    tag: "Web Applications",
    title: "Beautiful, Scalable Web Applications",
    desc: "Modern dashboards, SaaS platforms, and management systems built with cutting-edge technologies for maximum performance.",
  },
  {
    image: "/images/carousel/mobile-apps.png",
    tag: "Mobile Solutions",
    title: "Cross-Platform Mobile Experiences",
    desc: "Native-quality mobile apps for iOS & Android — hospital systems, e-commerce, CRMs, and more, all at your fingertips.",
  },
  {
    image: "/images/carousel/cloud-infra.png",
    tag: "Cloud & DevOps",
    title: "Robust Cloud Infrastructure & Automation",
    desc: "Scalable cloud architectures, CI/CD pipelines, and infrastructure automation to keep your systems running 24/7.",
  },
];

/* ────────────────────────────────────────
   Services Data
   ──────────────────────────────────────── */

const SERVICES = [
  {
    icon: Globe,
    title: "Web Development",
    desc: "High-performance websites and web applications with Next.js, React, and modern frameworks. SEO-optimized and blazing fast.",
    colorClass: styles.cardWeb,
  },
  {
    icon: Smartphone,
    title: "Mobile Apps",
    desc: "Cross-platform mobile applications using React Native and Flutter. Seamless UX across iOS and Android platforms.",
    colorClass: styles.cardMobile,
  },
  {
    icon: Cloud,
    title: "Cloud Services",
    desc: "AWS, Azure, and GCP solutions for scalable, reliable deployments. Database management, hosting, and 99.9% uptime guarantee.",
    colorClass: styles.cardCloud,
  },
  {
    icon: Brain,
    title: "AI & Automation",
    desc: "Intelligent automation, chatbots, and AI-powered tools that streamline operations and unlock data-driven insights.",
    colorClass: styles.cardAI,
  },
  {
    icon: GitBranch,
    title: "DevOps & CI/CD",
    desc: "Automated deployment pipelines, containerization with Docker/K8s, and infrastructure as code for faster delivery cycles.",
    colorClass: styles.cardDevOps,
  },
  {
    icon: Users,
    title: "IT Consulting",
    desc: "Strategic technology consulting to align your IT infrastructure with business goals. Architecture reviews and tech audits.",
    colorClass: styles.cardConsulting,
  },
];

/* ────────────────────────────────────────
   Tech Stack Marquee
   ──────────────────────────────────────── */

const TECH_STACK = [
  "React", "Next.js", "Node.js", "TypeScript", "PostgreSQL",
  "Prisma", "Docker", "AWS", "Tailwind CSS", "Electron",
  "React Native", "Python", "Redis", "GraphQL", "MongoDB",
  "Flutter", "Kubernetes", "Supabase", "Firebase", "Vercel",
];

/* ────────────────────────────────────────
   HomePage Component
   ──────────────────────────────────────── */

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleArrowClick = (direction: "prev" | "next") => {
    direction === "prev" ? prevSlide() : nextSlide();
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className={styles.homeRoot}>
      {/* Ambient background orbs */}
      <div className={`${styles.ambientGlow} ${styles.glowOrb1}`} />
      <div className={`${styles.ambientGlow} ${styles.glowOrb2}`} />
      <div className={`${styles.ambientGlow} ${styles.glowOrb3}`} />

      {/* ── Hero Carousel ── */}
      <section
        className={styles.carouselSection}
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div
          className={styles.carouselTrack}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {SLIDES.map((slide, idx) => (
            <div key={idx} className={styles.carouselSlide}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={slide.tag}
                className={styles.carouselImage}
                loading={idx === 0 ? "eager" : "lazy"}
              />
              <div className={styles.slideOverlay}>
                <span className={styles.slideTag}>
                  <Sparkles size={12} />
                  {slide.tag}
                </span>
                <h2 className={styles.slideTitle}>{slide.title}</h2>
                <p className={styles.slideDescription}>{slide.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          className={`${styles.carouselArrow} ${styles.arrowLeft}`}
          onClick={() => handleArrowClick("prev")}
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className={`${styles.carouselArrow} ${styles.arrowRight}`}
          onClick={() => handleArrowClick("next")}
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>

        {/* Dots */}
        <div className={styles.carouselDots}>
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.dot} ${idx === currentSlide ? styles.dotActive : ""}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Branding Section ── */}
      <section className={styles.brandingSection}>
        <div className={styles.brandLogo}>
          <Code2 size={32} color="white" strokeWidth={2.5} />
        </div>
        <h1 className={styles.brandName}>Shubh Software Services</h1>
        <p className={styles.brandTagline}>
          Crafting <strong>next-generation software</strong> that powers businesses across India & beyond
        </p>
      </section>

      {/* ── Stats Row ── */}
      <section className={styles.statsRow}>
        <div className={styles.statCard}>
          <p className={styles.statNumber}>50+</p>
          <p className={styles.statLabel}>Projects Delivered</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statNumber}>30+</p>
          <p className={styles.statLabel}>Happy Clients</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statNumber}>99.9%</p>
          <p className={styles.statLabel}>Uptime SLA</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statNumber}>24/7</p>
          <p className={styles.statLabel}>Support Available</p>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className={styles.servicesGrid}>
        {SERVICES.map((svc, idx) => (
          <div key={idx} className={`${styles.serviceCard} ${svc.colorClass}`}>
            <div className={styles.serviceIconWrap}>
              <svc.icon size={22} />
            </div>
            <h3 className={styles.serviceTitle}>{svc.title}</h3>
            <p className={styles.serviceDesc}>{svc.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Tech Stack Marquee ── */}
      <div className={styles.techMarquee}>
        <div className={styles.marqueeTrack}>
          {[...TECH_STACK, ...TECH_STACK].map((tech, idx) => (
            <span key={idx} className={styles.techBadge}>
              <span className={styles.techDot} />
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* ── CTA / Contact Section ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>
          <Zap size={22} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
          Ready to Build Something Amazing?
        </h2>
        <p className={styles.ctaDesc}>
          Let&apos;s discuss your project. From hospital management systems to e-commerce platforms — we bring your vision to life.
        </p>
        <div className={styles.ctaButtons}>
          <a href="tel:+919555040155" className={`${styles.ctaBtn} ${styles.ctaPrimary}`}>
            <Phone size={16} />
            +91 9555040155
          </a>
          <a href="mailto:ayushmishraofficial1427@gmail.com" className={`${styles.ctaBtn} ${styles.ctaSecondary}`}>
            <Mail size={16} />
            ayushmishraofficial1427@gmail.com
          </a>
          <span className={`${styles.ctaBtn} ${styles.ctaSecondary}`}>
            <Shield size={16} />
            ISO Compliant
          </span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footerSection}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} <a href="#">Shubh Software Services</a> — All Rights Reserved
        </p>
        <p className={styles.footerText} style={{ marginTop: 4, fontSize: "0.65rem" }}>
          Designed & Developed with ❤️ in India
        </p>
        <hr className={styles.footerDivider} />
      </footer>
    </div>
  );
}
