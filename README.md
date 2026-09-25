[index.html](https://github.com/user-attachments/files/32632310/index.html)
```html
<!--
====================================================================
  CLINICSYNC — CUSTOMIZATION CHECKLIST (READ BEFORE LAUNCH)
====================================================================
  [ ] Replace booking link      -> search for INSERT_CALENDLY_OR_BOOKING_LINK
  [ ] Replace demo video link   -> search for INSERT_LOOM_OR_VIDEO_LINK
  [ ] Replace contact email     -> search for INSERT_CONTACT_EMAIL
  [ ] Connect the contact form to a real endpoint (see comment near <form id="contactForm">)
  [ ] Add your real Calendly embed code (see comment near #calendly-placeholder)
  [ ] Review pricing figures ($500 setup / $100 mo) before publishing
  [ ] Review service scope copy — confirm it matches what you actually deliver
  [ ] Review privacy/compliance wording — this page does NOT claim HIPAA compliance
  [ ] Replace canonical URL and Open Graph image placeholder with real assets
====================================================================
-->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClinicSync | Capture Every Website Inquiry</title>
<meta name="description" content="ClinicSync helps dental and cosmetic practices capture website inquiries, respond instantly, and keep follow-up organized.">

<!-- Open Graph -->
<meta property="og:title" content="ClinicSync | Capture Every Website Inquiry">
<meta property="og:description" content="ClinicSync helps dental and cosmetic practices capture website inquiries, respond instantly, and keep follow-up organized.">
<meta property="og:type" content="website">
<!-- Replace with a real hosted image before launch -->
<meta property="og:image" content="INSERT_OG_IMAGE_URL_HERE">

<!-- Replace with your real domain -->
<link rel="canonical" href="INSERT_CANONICAL_URL_HERE">
<meta name="theme-color" content="#0B1220">

<!-- Inline favicon (abstract mark) so no external asset is required -->
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B1220'/%3E%3Cpath d='M9 17c0-4 3-7 7-7s7 3 7 7' stroke='%230EA5A5' stroke-width='2.4' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='9' cy='17' r='2' fill='%2322C55E'/%3E%3Ccircle cx='23' cy='17' r='2' fill='%230EA5A5'/%3E%3C/svg%3E">

<style>
/* ================================================================
   0. ROOT VARIABLES
==================================================================*/
:root{
  --teal:#0EA5A5;
  --teal-dark:#0B8484;
  --navy:#0B1220;
  --slate:#182333;
  --bg:#F7FAFC;
  --white:#FFFFFF;
  --muted:#64748B;
  --soft-teal:#E6FFFB;
  --green:#22C55E;
  --border:#E2E8F0;

  --radius-sm:10px;
  --radius-md:16px;
  --radius-lg:24px;

  --shadow-sm: 0 1px 2px rgba(11,18,32,0.06);
  --shadow-md: 0 8px 24px rgba(11,18,32,0.08);
  --shadow-lg: 0 24px 60px rgba(11,18,32,0.14);

  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:24px; --space-6:32px; --space-7:48px; --space-8:64px; --space-9:96px;

  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --maxw: 1200px;
  --transition: 220ms cubic-bezier(.4,0,.2,1);
}

/* ================================================================
   1. RESET
==================================================================*/
*,*::before,*::after{ box-sizing:border-box; }
html{ scroll-behavior:smooth; -webkit-text-size-adjust:100%; }
body{
  margin:0;
  font-family:var(--font);
  color:var(--slate);
  background:var(--bg);
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
}
img,svg{ display:block; max-width:100%; }
a{ color:inherit; text-decoration:none; }
ul{ list-style:none; margin:0; padding:0; }
button{ font-family:inherit; cursor:pointer; }
h1,h2,h3,h4,p{ margin:0; }
input,textarea,button{ font-family:inherit; font-size:1rem; }

/* Skip link */
.skip-link{
  position:absolute; left:-9999px; top:0; z-index:1000;
  background:var(--navy); color:#fff; padding:12px 20px; border-radius:0 0 10px 0;
}
.skip-link:focus{ left:0; }

/* Focus visibility */
:focus-visible{
  outline:2px solid var(--teal);
  outline-offset:3px;
  border-radius:4px;
}

@media (prefers-reduced-motion: reduce){
  *{ animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; scroll-behavior:auto !important; }
}

/* ================================================================
   2. LAYOUT HELPERS
==================================================================*/
.container{ max-width:var(--maxw); margin:0 auto; padding:0 var(--space-5); }
.section{ padding:var(--space-9) 0; }
@media (max-width:768px){ .section{ padding:var(--space-7) 0; } }

.section-head{ max-width:680px; margin:0 auto var(--space-7); text-align:center; }
.section-head.left{ margin-left:0; text-align:left; }

.eyebrow{
  display:inline-flex; align-items:center; gap:8px;
  font-size:0.8rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  color:var(--teal-dark);
  background:var(--soft-teal);
  padding:6px 14px;
  border-radius:999px;
  margin-bottom:var(--space-4);
}
.section-title{
  font-size:clamp(1.7rem,3.2vw,2.5rem);
  font-weight:800;
  letter-spacing:-0.02em;
  color:var(--navy);
  line-height:1.2;
}
.section-sub{
  margin-top:var(--space-4);
  color:var(--muted);
  font-size:1.05rem;
}

.grid{ display:grid; gap:var(--space-5); }
.grid-2{ grid-template-columns:repeat(2,1fr); }
.grid-3{ grid-template-columns:repeat(3,1fr); }
.grid-6{ grid-template-columns:repeat(6,1fr); }
@media (max-width:900px){
  .grid-3{ grid-template-columns:1fr 1fr; }
  .grid-6{ grid-template-columns:1fr 1fr; }
}
@media (max-width:640px){
  .grid-2, .grid-3, .grid-6{ grid-template-columns:1fr; }
}

/* ================================================================
   3. BUTTONS
==================================================================*/
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:14px 26px;
  border-radius:12px;
  font-weight:700;
  font-size:0.98rem;
  border:1px solid transparent;
  transition:transform var(--transition), box-shadow var(--transition), background var(--transition), border-color var(--transition);
  white-space:nowrap;
}
.btn:active{ transform:translateY(1px); }

.btn-primary{
  background:linear-gradient(135deg,var(--teal),var(--teal-dark));
  color:#fff;
  box-shadow:0 10px 24px rgba(14,165,165,0.28);
}
.btn-primary:hover{ box-shadow:0 14px 30px rgba(14,165,165,0.36); transform:translateY(-1px); }

.btn-secondary{
  background:#fff;
  color:var(--navy);
  border-color:var(--border);
}
.btn-secondary:hover{ border-color:var(--teal); color:var(--teal-dark); }

.btn-ghost-on-dark{
  background:rgba(255,255,255,0.08);
  color:#fff;
  border-color:rgba(255,255,255,0.25);
}
.btn-ghost-on-dark:hover{ background:rgba(255,255,255,0.16); }

.btn-block{ width:100%; }
.btn-sm{ padding:8px 14px; font-size:0.85rem; border-radius:8px; }

.cta-row{ display:flex; flex-wrap:wrap; gap:var(--space-4); align-items:center; }

/* ================================================================
   4. HEADER
==================================================================*/
.site-header{
  position:sticky; top:0; z-index:500;
  background:rgba(247,250,252,0.85);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);
}
.header-inner{
  display:flex; align-items:center; justify-content:space-between;
  padding:14px var(--space-5);
  max-width:var(--maxw); margin:0 auto;
}
.logo{ display:flex; align-items:center; gap:10px; font-weight:800; font-size:1.15rem; color:var(--navy); }
.logo-mark{ width:34px; height:34px; flex-shrink:0; }

.main-nav ul{ display:flex; gap:var(--space-6); }
.main-nav a{
  font-weight:600; font-size:0.95rem; color:var(--slate);
  padding:6px 2px; border-bottom:2px solid transparent;
  transition:color var(--transition), border-color var(--transition);
}
.main-nav a:hover{ color:var(--teal-dark); border-color:var(--teal); }

.header-actions{ display:flex; align-items:center; gap:var(--space-4); }

.menu-toggle{
  display:none;
  background:none; border:1px solid var(--border); border-radius:10px;
  width:44px; height:44px; align-items:center; justify-content:center;
}
.menu-toggle svg{ width:22px; height:22px; }

@media (max-width:860px){
  .main-nav{
    position:fixed; inset:0 0 0 auto; top:0;
    height:100vh; width:min(320px,85vw);
    background:#fff;
    box-shadow:-16px 0 40px rgba(11,18,32,0.15);
    transform:translateX(100%);
    transition:transform var(--transition);
    padding:90px var(--space-5) var(--space-5);
    z-index:600;
  }
  .main-nav.open{ transform:translateX(0); }
  .main-nav ul{ flex-direction:column; gap:var(--space-5); }
  .main-nav .nav-cta{ display:block; margin-top:var(--space-5); }
  .header-actions .btn-primary.desktop-only{ display:none; }
  .menu-toggle{ display:flex; }
  .nav-scrim{
    position:fixed; inset:0; background:rgba(11,18,32,0.4);
    opacity:0; pointer-events:none; transition:opacity var(--transition); z-index:590;
  }
  .nav-scrim.show{ opacity:1; pointer-events:auto; }
}
@media (min-width:861px){ .nav-cta-mobile{ display:none; } }

/* ================================================================
   5. HERO
==================================================================*/
.hero{
  position:relative;
  overflow:hidden;
  padding:var(--space-9) 0;
  background:
    radial-gradient(600px 400px at 85% -10%, rgba(14,165,165,0.14), transparent 60%),
    radial-gradient(500px 400px at -10% 30%, rgba(14,165,165,0.08), transparent 60%),
    var(--bg);
}
.hero-inner{
  display:grid; grid-template-columns:1.05fr 0.95fr; gap:var(--space-8); align-items:center;
}
@media (max-width:960px){ .hero-inner{ grid-template-columns:1fr; } }

.hero-eyebrow{
  display:inline-flex; align-items:center; gap:8px;
  background:#fff; border:1px solid var(--border); box-shadow:var(--shadow-sm);
  padding:8px 16px; border-radius:999px; font-size:0.85rem; font-weight:600; color:var(--slate);
  margin-bottom:var(--space-5);
}
.hero-eyebrow .dot{ width:8px; height:8px; border-radius:50%; background:var(--green); }

.hero h1{
  font-size:clamp(2.1rem,4.6vw,3.4rem);
  font-weight:800; letter-spacing:-0.03em; line-height:1.12;
  color:var(--navy);
}
.hero-sub{
  margin-top:var(--space-5);
  font-size:1.15rem; color:var(--muted); max-width:560px;
}
.hero .cta-row{ margin-top:var(--space-6); }
.trust-line{
  margin-top:var(--space-6);
  font-size:0.9rem; color:var(--muted);
  display:flex; align-items:center; gap:10px;
}
.trust-line svg{ width:18px; height:18px; color:var(--teal); flex-shrink:0; }

/* ---- Hero product preview ---- */
.preview-window{
  background:#fff;
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow-lg);
  overflow:hidden;
}
.preview-header{
  background:linear-gradient(135deg,var(--navy),var(--slate));
  color:#fff;
  padding:16px 20px;
  display:flex; align-items:center; justify-content:space-between;
  gap:10px;
}
.preview-header .ph-title{ display:flex; align-items:center; gap:8px; font-weight:700; font-size:0.95rem; }
.preview-header .ph-title svg{ width:16px; height:16px; color:var(--teal); }
.preview-badge{
  font-size:0.7rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;
  background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.2);
  padding:4px 10px; border-radius:999px;
}
.preview-body{ padding:var(--space-5); display:flex; flex-direction:column; gap:var(--space-4); }

.pv-card{
  border:1px solid var(--border);
  border-radius:var(--radius-md);
  padding:var(--space-4);
  background:var(--bg);
  display:flex; gap:12px; align-items:flex-start;
  opacity:0; transform:translateY(10px);
  animation:pvIn 600ms ease forwards;
}
.pv-card:nth-child(1){ animation-delay:.05s; }
.pv-card:nth-child(2){ animation-delay:.25s; }
.pv-card:nth-child(3){ animation-delay:.45s; }
.pv-card:nth-child(4){ animation-delay:.65s; }
@keyframes pvIn{ to{ opacity:1; transform:translateY(0);} }
@media (prefers-reduced-motion: reduce){ .pv-card{ opacity:1; transform:none; animation:none; } }

.pv-icon{
  width:38px; height:38px; border-radius:10px; flex-shrink:0;
  background:var(--soft-teal); color:var(--teal-dark);
  display:flex; align-items:center; justify-content:center;
}
.pv-icon svg{ width:19px; height:19px; }
.pv-content{ flex:1; min-width:0; }
.pv-title-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.pv-title{ font-weight:700; font-size:0.92rem; color:var(--navy); }
.pv-meta{ font-size:0.82rem; color:var(--muted); margin-top:2px; }

.status-pill{
  display:inline-flex; align-items:center; gap:6px;
  font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;
  padding:4px 10px; border-radius:999px;
}
.status-new{ background:#FFF3D6; color:#92650A; }
.status-contacted{ background:#DBEAFE; color:#1E40AF; }
.status-booked{ background:#DCFCE7; color:#166534; }
.status-lost{ background:#FEE2E2; color:#991B1B; }
.pulse-dot{
  width:7px; height:7px; border-radius:50%; background:#92650A;
  animation:pulse 1.6s ease-in-out infinite;
}
@keyframes pulse{ 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.4; transform:scale(1.4);} }

.pv-table{ border-top:1px dashed var(--border); margin-top:4px; padding-top:10px; }
.pv-table-row{ display:flex; justify-content:space-between; font-size:0.82rem; padding:4px 0; color:var(--slate); }
.pv-table-row span:first-child{ color:var(--muted); }

.preview-footnote{
  text-align:center; font-size:0.78rem; color:var(--muted); padding:12px var(--space-5) 18px;
  border-top:1px solid var(--border);
}

/* ================================================================
   6. PROBLEM SECTION
==================================================================*/
.problem-cards{ }
.problem-card{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-md);
  padding:var(--space-6); box-shadow:var(--shadow-sm);
  transition:box-shadow var(--transition), transform var(--transition);
}
.problem-card:hover{ box-shadow:var(--shadow-md); transform:translateY(-3px); }
.problem-icon{
  width:48px; height:48px; border-radius:12px;
  background:var(--soft-teal); color:var(--teal-dark);
  display:flex; align-items:center; justify-content:center; margin-bottom:var(--space-4);
}
.problem-icon svg{ width:24px; height:24px; }
.problem-card h3{ font-size:1.1rem; color:var(--navy); font-weight:700; margin-bottom:8px; }
.problem-card p{ color:var(--muted); font-size:0.96rem; }

.problem-note{
  margin-top:var(--space-7);
  text-align:center;
  max-width:700px; margin-left:auto; margin-right:auto;
  color:var(--slate); font-size:1.02rem;
  background:var(--soft-teal);
  border:1px solid #C7F5EF;
  border-radius:var(--radius-md);
  padding:var(--space-5);
}

/* ================================================================
   7. HOW IT WORKS
==================================================================*/
.workflow{
  display:grid; grid-template-columns:repeat(5,1fr); gap:var(--space-4);
  position:relative;
}
@media (max-width:900px){
  .workflow{ grid-template-columns:1fr; gap:var(--space-5); }
}
.wf-step{
  position:relative;
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-md);
  padding:var(--space-5); text-align:left;
  box-shadow:var(--shadow-sm);
}
.wf-num{
  display:inline-flex; align-items:center; justify-content:center;
  width:28px; height:28px; border-radius:50%;
  background:var(--navy); color:#fff; font-size:0.8rem; font-weight:700;
  margin-bottom:var(--space-3);
}
.wf-icon{
  width:42px; height:42px; border-radius:10px; margin-bottom:var(--space-3);
  background:var(--soft-teal); color:var(--teal-dark);
  display:flex; align-items:center; justify-content:center;
}
.wf-icon svg{ width:22px; height:22px; }
.wf-step h3{ font-size:1rem; font-weight:700; color:var(--navy); margin-bottom:6px; }
.wf-step p{ font-size:0.88rem; color:var(--muted); }

.wf-connector{
  display:none;
}
@media (min-width:901px){
  .workflow{ padding-top:6px; }
  .wf-step:not(:last-child)::after{
    content:"";
    position:absolute;
    top:34px; right:calc(-1 * var(--space-4) - 2px);
    width:calc(var(--space-4));
    height:2px;
    background:repeating-linear-gradient(90deg, var(--teal) 0 6px, transparent 6px 10px);
  }
}
@media (max-width:900px){
  .wf-step:not(:last-child)::after{
    content:"";
    position:absolute;
    left:34px; bottom:calc(-1 * var(--space-5) + 2px);
    width:2px; height:var(--space-5);
    background:repeating-linear-gradient(180deg, var(--teal) 0 6px, transparent 6px 10px);
  }
}

/* ================================================================
   8. WHAT YOU GET
==================================================================*/
.deliverable-card{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-md);
  padding:var(--space-6);
  box-shadow:var(--shadow-sm);
  transition:box-shadow var(--transition), transform var(--transition);
  height:100%;
}
.deliverable-card:hover{ box-shadow:var(--shadow-md); transform:translateY(-3px); }
.deliverable-icon{
  width:46px; height:46px; border-radius:12px;
  background:var(--navy); color:var(--teal);
  display:flex; align-items:center; justify-content:center; margin-bottom:var(--space-4);
}
.deliverable-icon svg{ width:22px; height:22px; }
.deliverable-card h3{ font-size:1.05rem; font-weight:700; color:var(--navy); margin-bottom:8px; }
.deliverable-card p{ color:var(--muted); font-size:0.94rem; }

.needs-panel{
  margin-top:var(--space-7);
  background:var(--navy);
  color:#fff;
  border-radius:var(--radius-lg);
  padding:var(--space-6);
  display:grid; grid-template-columns:1fr 1.4fr; gap:var(--space-6);
}
@media (max-width:800px){ .needs-panel{ grid-template-columns:1fr; } }
.needs-panel h3{ font-size:1.2rem; font-weight:700; margin-bottom:10px; }
.needs-panel p.lead{ color:#B7C3D6; font-size:0.95rem; }
.needs-list{ display:grid; gap:12px; }
.needs-list li{ display:flex; gap:10px; align-items:flex-start; font-size:0.94rem; color:#E2E8F0; }
.needs-list svg{ width:18px; height:18px; color:var(--teal); flex-shrink:0; margin-top:2px; }

/* ================================================================
   9. PRODUCT EXPERIENCE (DASHBOARD MOCKUP)
==================================================================*/
.dashboard-mock{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-lg); overflow:hidden;
}
.dm-header{
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
  padding:18px 22px; border-bottom:1px solid var(--border);
  background:linear-gradient(135deg,#0B1220,#182333);
  color:#fff;
}
.dm-header .dm-title{ display:flex; align-items:center; gap:10px; font-weight:700; }
.dm-header .dm-title svg{ width:18px; height:18px; color:var(--teal); }
.dm-tabs{ display:flex; gap:6px; padding:14px 22px; border-bottom:1px solid var(--border); flex-wrap:wrap; background:var(--bg); }
.dm-tab{
  border:1px solid var(--border); background:#fff; padding:8px 14px; border-radius:999px;
  font-size:0.85rem; font-weight:600; color:var(--slate);
}
.dm-tab[aria-selected="true"]{ background:var(--navy); color:#fff; border-color:var(--navy); }
.dm-body{ display:grid; grid-template-columns:1.6fr 1fr; }
@media (max-width:860px){ .dm-body{ grid-template-columns:1fr; } }

.dm-table{ padding:10px 0; }
.dm-row{
  display:grid; grid-template-columns:1.4fr 1.2fr 1fr 1fr 0.8fr;
  gap:10px; align-items:center;
  padding:14px 22px; border-bottom:1px solid var(--border);
  font-size:0.88rem;
  cursor:pointer; background:transparent; border-left:3px solid transparent; text-align:left; width:100%;
  transition:background var(--transition);
}
.dm-row:hover, .dm-row.active{ background:var(--soft-teal); border-left-color:var(--teal); }
.dm-row .dm-name{ font-weight:700; color:var(--navy); }
.dm-row .dm-label{ display:none; font-weight:600; color:var(--muted); font-size:0.72rem; text-transform:uppercase; }
@media (max-width:640px){
  .dm-row{ grid-template-columns:1fr 1fr; row-gap:8px; }
  .dm-row .dm-label{ display:block; }
  .dm-cell{ display:flex; flex-direction:column; gap:2px; }
}
.dm-detail{
  padding:var(--space-5); background:var(--bg);
  border-left:1px solid var(--border);
}
@media (max-width:860px){ .dm-detail{ border-left:none; border-top:1px solid var(--border); } }
.dm-detail h4{ font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin-bottom:10px; }
.dm-detail-name{ font-size:1.2rem; font-weight:800; color:var(--navy); }
.dm-detail-row{ display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px dashed var(--border); font-size:0.9rem; }
.dm-detail-row span:first-child{ color:var(--muted); }
.dm-detail-row span:last-child{ font-weight:600; color:var(--slate); text-align:right; }
.dm-note{ margin-top:var(--space-5); font-size:0.86rem; color:var(--muted); }

.mock-footnote{
  text-align:center; color:var(--muted); font-size:0.9rem; margin-top:var(--space-5);
}

/* ================================================================
   10. WHY SIMPLE WORKFLOW (PILLARS)
==================================================================*/
.pillar-card{
  text-align:center; background:#fff; border:1px solid var(--border);
  border-radius:var(--radius-md); padding:var(--space-6);
  box-shadow:var(--shadow-sm);
}
.pillar-icon{
  width:56px; height:56px; border-radius:50%;
  background:var(--soft-teal); color:var(--teal-dark);
  display:flex; align-items:center; justify-content:center;
  margin:0 auto var(--space-4);
}
.pillar-icon svg{ width:26px; height:26px; }
.pillar-card h3{ font-size:1.1rem; font-weight:700; color:var(--navy); margin-bottom:8px; }
.pillar-card p{ color:var(--muted); font-size:0.94rem; }

/* ================================================================
   11. PRICING
==================================================================*/
.pricing-grid{ display:grid; grid-template-columns:1fr 1fr; gap:var(--space-6); align-items:stretch; }
@media (max-width:800px){ .pricing-grid{ grid-template-columns:1fr; } }
.price-card{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg);
  padding:var(--space-7); box-shadow:var(--shadow-sm);
  display:flex; flex-direction:column;
}
.price-card.featured{
  border:2px solid var(--teal);
  box-shadow:var(--shadow-md);
  position:relative;
}
.price-card.featured::before{
  content:"Most practices start here";
  position:absolute; top:-14px; left:50%; transform:translateX(-50%);
  background:var(--teal); color:#fff; font-size:0.72rem; font-weight:700;
  padding:6px 14px; border-radius:999px; letter-spacing:0.03em;
}
.price-title{ font-size:1.2rem; font-weight:700; color:var(--navy); }
.price-amount{ font-size:2.2rem; font-weight:800; color:var(--navy); margin:10px 0; }
.price-amount span{ font-size:1rem; font-weight:600; color:var(--muted); }
.price-desc{ color:var(--muted); margin-bottom:var(--space-5); }
.price-list{ display:grid; gap:12px; margin-bottom:var(--space-6); flex:1; }
.price-list li{ display:flex; gap:10px; align-items:flex-start; font-size:0.94rem; }
.price-list svg{ width:18px; height:18px; color:var(--teal); flex-shrink:0; margin-top:2px; }

.pricing-note{ text-align:center; color:var(--muted); font-size:0.9rem; margin-top:var(--space-6); }

/* ================================================================
   12. FAQ
==================================================================*/
.faq-list{ max-width:800px; margin:0 auto; display:grid; gap:12px; }
.faq-item{ background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; }
.faq-q{
  width:100%; text-align:left; background:none; border:none;
  padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px;
  font-weight:700; font-size:0.98rem; color:var(--navy);
}
.faq-q .icon-plus{ width:20px; height:20px; flex-shrink:0; color:var(--teal); transition:transform var(--transition); }
.faq-q[aria-expanded="true"] .icon-plus{ transform:rotate(45deg); }
.faq-a{
  max-height:0; overflow:hidden; transition:max-height var(--transition), padding var(--transition);
  padding:0 20px; color:var(--muted); font-size:0.94rem;
}
.faq-item.open .faq-a{ max-height:400px; padding:0 20px 20px; }

/* ================================================================
   13. FINAL CTA + CONTACT
==================================================================*/
.final-cta{ background:var(--navy); color:#fff; border-radius:var(--radius-lg); padding:var(--space-8) var(--space-6); text-align:center; margin-bottom:var(--space-8); }
.final-cta h2{ font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; }
.final-cta p{ color:#B7C3D6; margin-top:var(--space-3); max-width:560px; margin-left:auto; margin-right:auto; }
.final-cta .cta-row{ justify-content:center; margin-top:var(--space-6); }

.contact-grid{ display:grid; grid-template-columns:1fr 1fr; gap:var(--space-7); align-items:start; }
@media (max-width:860px){ .contact-grid{ grid-template-columns:1fr; } }

.contact-info-card{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg);
  padding:var(--space-6); box-shadow:var(--shadow-sm);
}
.contact-info-card h3{ font-size:1.1rem; font-weight:700; color:var(--navy); margin-bottom:10px; }
.contact-line{ display:flex; gap:10px; align-items:center; margin-top:14px; color:var(--slate); font-size:0.95rem; }
.contact-line svg{ width:18px; height:18px; color:var(--teal); flex-shrink:0; }

.calendly-placeholder{
  margin-top:var(--space-5);
  border:2px dashed var(--border);
  border-radius:var(--radius-md);
  padding:var(--space-6);
  text-align:center;
  color:var(--muted);
  background:var(--bg);
}
.calendly-placeholder strong{ color:var(--navy); display:block; margin-bottom:6px; }

.privacy-note{
  margin-top:var(--space-5); font-size:0.85rem; color:var(--muted);
  background:var(--soft-teal); border-radius:10px; padding:14px 16px;
}

.form-card{
  background:#fff; border:1px solid var(--border); border-radius:var(--radius-lg);
  padding:var(--space-6); box-shadow:var(--shadow-md);
}
.field{ margin-bottom:var(--space-4); }
.field label{ display:block; font-weight:600; font-size:0.9rem; margin-bottom:6px; color:var(--navy); }
.field input, .field textarea{
  width:100%; border:1px solid var(--border); border-radius:10px; padding:12px 14px;
  background:var(--bg); color:var(--slate); transition:border-color var(--transition), box-shadow var(--transition);
}
.field input:focus, .field textarea:focus{
  outline:none; border-color:var(--teal); box-shadow:0 0 0 3px rgba(14,165,165,0.15); background:#fff;
}
.field textarea{ min-height:110px; resize:vertical; }
.field .error-msg{ color:#B91C1C; font-size:0.82rem; margin-top:6px; display:none; }
.field.invalid input, .field.invalid textarea{ border-color:#B91C1C; }
.field.invalid .error-msg{ display:block; }
.required-mark{ color:#B91C1C; }

.form-success{
  display:none; text-align:center; padding:var(--space-6);
  border:1px solid #BBF7D0; background:#F0FDF4; border-radius:var(--radius-md);
  color:#166534;
}
.form-success.show{ display:block; }
.form-success svg{ width:36px; height:36px; margin:0 auto 10px; color:var(--green); }

/* ================================================================
   14. FOOTER
==================================================================*/
.site-footer{ background:var(--navy); color:#B7C3D6; padding:var(--space-8) 0 var(--space-5); }
.footer-grid{ display:grid; grid-template-columns:2fr 1fr 1fr; gap:var(--space-7); }
@media (max-width:760px){ .footer-grid{ grid-template-columns:1fr; gap:var(--space-6); } }
.footer-logo{ display:flex; align-items:center; gap:10px; color:#fff; font-weight:800; font-size:1.1rem; margin-bottom:12px; }
.footer-logo .logo-mark{ width:30px; height:30px; }
.footer-tagline{ font-size:0.92rem; max-width:320px; }
.footer-col h4{ color:#fff; font-size:0.85rem; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:14px; }
.footer-col ul{ display:grid; gap:10px; }
.footer-col a{ font-size:0.92rem; transition:color var(--transition); }
.footer-col a:hover{ color:#fff; }
.footer-bottom{
  border-top:1px solid rgba(255,255,255,0.12); margin-top:var(--space-7); padding-top:var(--space-5);
  display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; font-size:0.82rem; color:#8697AF;
}

/* ================================================================
   15. REVEAL ON SCROLL
==================================================================*/
.reveal{ opacity:0; transform:translateY(18px); transition:opacity 600ms ease, transform 600ms ease; }
.reveal.is-visible{ opacity:1; transform:translateY(0); }
@media (prefers-reduced-motion: reduce){ .reveal{ opacity:1; transform:none; transition:none; } }

/* Visually hidden utility */
.sr-only{
  position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden;
  clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
</style>
</head>
<body>

<a href="#main" class="skip-link">Skip to main content</a>

<!-- ================================================================
     SECTION 1: STICKY HEADER
================================================================= -->
<header class="site-header">
  <div class="header-inner">
    <a href="#top" class="logo" aria-label="ClinicSync home">
      <svg class="logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0B1220"/>
        <path d="M9 17c0-4 3-7 7-7s7 3 7 7" stroke="#0EA5A5" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <circle cx="9" cy="17" r="2" fill="#22C55E"/>
        <circle cx="23" cy="17" r="2" fill="#0EA5A5"/>
      </svg>
      ClinicSync
    </a>

    <nav class="main-nav" id="primaryNav" aria-label="Primary">
      <ul>
        <li><a href="#how-it-works" class="nav-link">How it works</a></li>
        <li><a href="#what-you-get" class="nav-link">What you get</a></li>
        <li><a href="#pricing" class="nav-link">Pricing</a></li>
        <li><a href="#faq" class="nav-link">FAQ</a></li>
      </ul>
      <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-primary btn-block nav-cta">Book a 10-minute call</a>
    </nav>

    <div class="header-actions">
      <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-primary desktop-only">Book a 10-minute call</a>
      <button class="menu-toggle" id="menuToggle" aria-expanded="false" aria-controls="primaryNav" aria-label="Open menu">
        <svg id="menuIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
  <div class="nav-scrim" id="navScrim"></div>
</header>

<main id="main">

<!-- ================================================================
     SECTION 2: HERO
================================================================= -->
<section class="hero" id="top">
  <div class="container hero-inner">
    <div class="hero-copy reveal">
      <span class="hero-eyebrow"><span class="dot" aria-hidden="true"></span> For dental &amp; cosmetic practices</span>
      <h1>Turn website inquiries into organized next steps.</h1>
      <p class="hero-sub">ClinicSync captures new website inquiries, sends an immediate confirmation, alerts your team, and keeps every follow-up visible in one simple workflow.</p>

      <div class="cta-row">
        <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-primary">Book a 10-minute call</a>
        <a href="INSERT_LOOM_OR_VIDEO_LINK" class="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/></svg>
          Watch the 60-second demo
        </a>
      </div>

      <p class="trust-line">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
        Built for dental and cosmetic practices that want a simpler way to manage new inquiries.
      </p>
    </div>

    <div class="hero-visual reveal" aria-label="Live workflow preview using demo data">
      <div class="preview-window">
        <div class="preview-header">
          <div class="ph-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
            Live workflow preview
          </div>
          <span class="preview-badge">Demo data only</span>
        </div>

        <div class="preview-body">
          <!-- Step 1: New inquiry -->
          <div class="pv-card">
            <div class="pv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>
            </div>
            <div class="pv-content">
              <div class="pv-title-row">
                <span class="pv-title">New inquiry — Jordan Lee</span>
                <span class="status-pill status-new"><span class="pulse-dot" aria-hidden="true"></span>New</span>
              </div>
              <p class="pv-meta">Requested: New patient consultation</p>
            </div>
          </div>

          <!-- Step 2: Confirmation email -->
          <div class="pv-card">
            <div class="pv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            </div>
            <div class="pv-content">
              <div class="pv-title-row">
                <span class="pv-title">Confirmation email sent</span>
              </div>
              <p class="pv-meta">"Thanks Jordan — we received your request..."</p>
            </div>
          </div>

          <!-- Step 3: Team notification -->
          <div class="pv-card">
            <div class="pv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
            </div>
            <div class="pv-content">
              <div class="pv-title-row">
                <span class="pv-title">Front desk notified</span>
              </div>
              <p class="pv-meta">New inquiry alert delivered instantly by email</p>
            </div>
          </div>

          <!-- Step 4: Dashboard row -->
          <div class="pv-card">
            <div class="pv-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/></svg>
            </div>
            <div class="pv-content" style="width:100%;">
              <span class="pv-title">Lead dashboard updated</span>
              <div class="pv-table">
                <div class="pv-table-row"><span>Name</span><span>Jordan Lee</span></div>
                <div class="pv-table-row"><span>Service</span><span>New patient consultation</span></div>
                <div class="pv-table-row"><span>Status</span><span>New</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-footnote">Fictional demo data — for illustration purposes only.</div>
      </div>
    </div>
  </div>
</section>

<!-- ================================================================
     SECTION 3: THE PROBLEM
================================================================= -->
<section class="section" id="problem">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">The problem</span>
      <h2 class="section-title">Good inquiries should not disappear into an inbox.</h2>
    </div>

    <div class="grid grid-3 problem-cards">
      <div class="problem-card reveal">
        <div class="problem-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
        </div>
        <h3>Delayed replies</h3>
        <p>New inquiries wait while the front desk handles calls, check-ins, and daily requests.</p>
      </div>

      <div class="problem-card reveal">
        <div class="problem-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        </div>
        <h3>Scattered information</h3>
        <p>Details live across inboxes, forms, spreadsheets, and messages with no single view.</p>
      </div>

      <div class="problem-card reveal">
        <div class="problem-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3"/><polyline points="14 3 18.5 6.5 15 8.5"/><polyline points="10 21 5.5 17.5 9 15.5"/></svg>
        </div>
        <h3>Inconsistent follow-up</h3>
        <p>Without a clear process, some inquiries are contacted while others are forgotten.</p>
      </div>
    </div>

    <p class="problem-note reveal">ClinicSync is designed for practices that already receive website inquiries but want a clearer, faster, and more consistent way to handle them.</p>
  </div>
</section>

<!-- ================================================================
     SECTION 4: HOW IT WORKS
================================================================= -->
<section class="section" id="how-it-works" style="background:#fff;">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">How it works</span>
      <h2 class="section-title">A simple workflow from inquiry to follow-up.</h2>
      <p class="section-sub">Five steps. No new tools for your team to learn from scratch.</p>
    </div>

    <div class="workflow">
      <div class="wf-step reveal">
        <span class="wf-num">1</span>
        <div class="wf-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/></svg>
        </div>
        <h3>Inquiry submitted</h3>
        <p>A visitor completes your appointment or consultation form.</p>
      </div>

      <div class="wf-step reveal">
        <span class="wf-num">2</span>
        <div class="wf-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/></svg>
        </div>
        <h3>Lead captured</h3>
        <p>The inquiry is added to a simple dashboard with the important details.</p>
      </div>

      <div class="wf-step reveal">
        <span class="wf-num">3</span>
        <div class="wf-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
        </div>
        <h3>Patient receives confirmation</h3>
        <p>A professional email confirms the request was received and explains next steps.</p>
      </div>

      <div class="wf-step reveal">
        <span class="wf-num">4</span>
        <div class="wf-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        </div>
        <h3>Team gets notified</h3>
        <p>Your designated team member receives the inquiry details immediately.</p>
      </div>

      <div class="wf-step reveal">
        <span class="wf-num">5</span>
        <div class="wf-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <h3>Follow-up stays visible</h3>
        <p>The team can update the status and use optional follow-up messages when needed.</p>
      </div>
    </div>
  </div>
</section>

<!-- ================================================================
     SECTION 5: WHAT YOU GET
================================================================= -->
<section class="section" id="what-you-get">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">What you get</span>
      <h2 class="section-title">Everything your team needs to handle website inquiries clearly.</h2>
    </div>

    <div class="grid grid-3">
      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="13" x2="16" y2="13"/></svg>
        </div>
        <h3>Inquiry capture form</h3>
        <p>A focused appointment or consultation form designed around the information your team needs.</p>
      </div>

      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="10" x2="9" y2="20"/></svg>
        </div>
        <h3>Lead dashboard</h3>
        <p>A simple Google Sheets or Airtable view showing new inquiries, contact details, requested service, and status.</p>
      </div>

      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
        </div>
        <h3>Instant confirmation email</h3>
        <p>A clear, professional response sent to the person immediately after they submit an inquiry.</p>
      </div>

      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        </div>
        <h3>Team notifications</h3>
        <p>An instant email notification so the right person knows a new inquiry has arrived.</p>
      </div>

      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3"/><polyline points="14 3 18.5 6.5 15 8.5"/><polyline points="10 21 5.5 17.5 9 15.5"/></svg>
        </div>
        <h3>Follow-up sequence</h3>
        <p>Optional follow-up emails for inquiries that have not received a response.</p>
      </div>

      <div class="deliverable-card reveal">
        <div class="deliverable-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </div>
        <h3>Setup and handover</h3>
        <p>Configuration, testing, documentation, and a short recorded walkthrough for your team.</p>
      </div>
    </div>

    <div class="needs-panel reveal">
      <div>
        <h3>What we need from you</h3>
        <p class="lead">A short list to get your setup started — nothing technical required on your end.</p>
      </div>
      <ul class="needs-list">
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Clinic name and logo</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Services to feature</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Contact email for notifications</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Preferred booking link</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Confirmation and follow-up preferences</li>
        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Existing website or form access, if applicable</li>
      </ul>
    </div>
  </div>
</section>

<!-- ================================================================
     SECTION 6: PRODUCT EXPERIENCE
================================================================= -->
<section class="section" id="product-experience" style="background:#fff;">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Product experience</span>
      <h2 class="section-title">See what your team sees.</h2>
      <p class="section-sub">A simple inbox-style view of every website inquiry, its status, and who owns it.</p>
    </div>

    <div class="dashboard-mock reveal">
      <div class="dm-header">
        <div class="dm-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ClinicSync Inbox
        </div>
        <span class="preview-badge">Demo data only</span>
      </div>

      <div class="dm-tabs" role="tablist" aria-label="Filter inquiries by status" id="dmTabs">
        <button class="dm-tab" role="tab" aria-selected="true" data-filter="all">All</button>
        <button class="dm-tab" role="tab" aria-selected="false" data-filter="new">New</button>
        <button class="dm-tab" role="tab" aria-selected="false" data-filter="contacted">Contacted</button>
        <button class="dm-tab" role="tab" aria-selected="false" data-filter="booked">Booked</button>
      </div>

      <div class="dm-body">
        <div class="dm-table" id="dmTable">
          <button class="dm-row active" type="button" data-status="new"
            data-name="Jordan Lee" data-service="New patient consultation" data-date="May 14" data-team="Alicia (Front Desk)"
            data-phone="(555) 010-1122" data-note="Interested in a first-time consultation for general checkup." data-status-label="New">
            <span class="dm-cell"><span class="dm-label">Name</span><span class="dm-name">Jordan Lee</span></span>
            <span class="dm-cell"><span class="dm-label">Service</span>New patient consultation</span>
            <span class="dm-cell"><span class="dm-label">Received</span>May 14</span>
            <span class="dm-cell"><span class="dm-label">Assigned</span>Alicia</span>
            <span class="dm-cell"><span class="status-pill status-new">New</span></span>
          </button>

          <button class="dm-row" type="button" data-status="contacted"
            data-name="Taylor Morgan" data-service="Teeth whitening inquiry" data-date="May 13" data-team="Marcus (Office Mgr)"
            data-phone="(555) 010-3344" data-note="Asked about pricing and available weekend slots." data-status-label="Contacted">
            <span class="dm-cell"><span class="dm-label">Name</span><span class="dm-name">Taylor Morgan</span></span>
            <span class="dm-cell"><span class="dm-label">Service</span>Teeth whitening inquiry</span>
            <span class="dm-cell"><span class="dm-label">Received</span>May 13</span>
            <span class="dm-cell"><span class="dm-label">Assigned</span>Marcus</span>
            <span class="dm-cell"><span class="status-pill status-contacted">Contacted</span></span>
          </button>

          <button class="dm-row" type="button" data-status="booked"
            data-name="Casey Smith" data-service="Cosmetic consultation" data-date="May 12" data-team="Alicia (Front Desk)"
            data-phone="(555) 010-7788" data-note="Consultation scheduled for next Thursday at 2:00 PM." data-status-label="Booked">
            <span class="dm-cell"><span class="dm-label">Name</span><span class="dm-name">Casey Smith</span></span>
            <span class="dm-cell"><span class="dm-label">Service</span>Cosmetic consultation</span>
            <span class="dm-cell"><span class="dm-label">Received</span>May 12</span>
            <span class="dm-cell"><span class="dm-label">Assigned</span>Alicia</span>
            <span class="dm-cell"><span class="status-pill status-booked">Booked</span></span>
          </button>
        </div>

        <div class="dm-detail" id="dmDetail">
          <h4>Inquiry detail</h4>
          <div class="dm-detail-name" id="ddName">Jordan Lee</div>
          <div class="dm-detail-row"><span>Requested service</span><span id="ddService">New patient consultation</span></div>
          <div class="dm-detail-row"><span>Date received</span><span id="ddDate">May 14</span></div>
          <div class="dm-detail-row"><span>Assigned to</span><span id="ddTeam">Alicia (Front Desk)</span></div>
          <div class="dm-detail-row"><span>Phone (demo)</span><span id="ddPhone">(555) 010-1122</span></div>
          <div class="dm-detail-row"><span>Status</span><span id="ddStatus">New</span></div>
          <p class="dm-note" id="ddNote">Interested in a first-time consultation for general checkup.</p>
        </div>
      </div>
    </div>

    <p class="mock-footnote">Example interface using demo data. Your workflow can be customized to your practice.</p>
  </div>
</section>

<!-- ================================================================
     SECTION 7: WHY A SIMPLE WORKFLOW
================================================================= -->
<section class="section" id="why-simple">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Why it works</span>
      <h2 class="section-title">Less complexity for your team. More clarity after every inquiry.</h2>
    </div>

    <div class="grid grid-3">
      <div class="pillar-card reveal">
        <div class="pillar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h3>Speed</h3>
        <p>New inquiries receive an immediate acknowledgment instead of waiting for a manual response.</p>
      </div>

      <div class="pillar-card reveal">
        <div class="pillar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <h3>Clarity</h3>
        <p>Your team can see what arrived, when it arrived, and what needs attention.</p>
      </div>

      <div class="pillar-card reveal">
        <div class="pillar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.55 1z"/></svg>
        </div>
        <h3>Maintainability</h3>
        <p>ClinicSync uses a lightweight workflow that your team can understand and maintain without replacing every tool you already use.</p>
      </div>
    </div>
  </div>
</section>

<!-- ================================================================
     SECTION 8: PRICING
================================================================= -->
<section class="section" id="pricing" style="background:#fff;">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Pricing</span>
      <h2 class="section-title">Straightforward pricing, no surprises.</h2>
    </div>

    <div class="pricing-grid">
      <div class="price-card featured reveal">
        <div class="price-title">Initial setup</div>
        <div class="price-amount">Starting at $500</div>
        <p class="price-desc">A one-time implementation tailored to your current website, form, inbox, and follow-up needs.</p>
        <ul class="price-list">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Inquiry form setup or improvement</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Dashboard setup</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Email notifications</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Confirmation email</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Testing</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Handover walkthrough</li>
        </ul>
        <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-primary btn-block">Discuss your setup</a>
      </div>

      <div class="price-card reveal">
        <div class="price-title">Optional care plan</div>
        <div class="price-amount">$100 <span>/ month</span></div>
        <p class="price-desc">For practices that want ongoing monitoring, small message updates, workflow adjustments, and support.</p>
        <ul class="price-list">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Minor copy updates</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Workflow checks</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Small improvements</li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Basic support</li>
        </ul>
        <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-secondary btn-block">Discuss your setup</a>
      </div>
    </div>

    <p class="pricing-note">Final pricing depends on your existing website, forms, tools, and desired follow-up workflow.</p>
  </div>
</section>

<!-- ================================================================
     SECTION 9: FAQ
================================================================= -->
<section class="section" id="faq">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">FAQ</span>
      <h2 class="section-title">Common questions from practice owners and managers.</h2>
    </div>

    <div class="faq-list reveal" id="faqList">

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a1" id="faq-q1">
            Do we need a new website?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a1" role="region" aria-labelledby="faq-q1">
          <p>No. ClinicSync can work with an existing website and form when the current setup allows it. If needed, we can also create a focused inquiry page.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a2" id="faq-q2">
            Where do new inquiries go?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a2" role="region" aria-labelledby="faq-q2">
          <p>Inquiries can be logged in a simple Google Sheets or Airtable dashboard, while your designated team receives an email notification.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a3" id="faq-q3">
            Does the patient receive an automatic reply?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a3" role="region" aria-labelledby="faq-q3">
          <p>Yes. The workflow can send a professional confirmation email after the inquiry is submitted. The message and next steps are customized with your approval.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a4" id="faq-q4">
            Can our team edit the messages?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a4" role="region" aria-labelledby="faq-q4">
          <p>Yes. Message copy can be reviewed and adjusted to match your clinic's tone, services, and process.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a5" id="faq-q5">
            How long does setup take?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a5" role="region" aria-labelledby="faq-q5">
          <p>Many basic setups can be prepared within approximately 72 hours after receiving the required information and access. More complex setups may take longer.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a6" id="faq-q6">
            What tools does ClinicSync use?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a6" role="region" aria-labelledby="faq-q6">
          <p>The workflow can use your existing website form, Google Sheets or Airtable, email, and lightweight automation tools. The exact setup depends on your current process.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a7" id="faq-q7">
            Is patient data secure?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a7" role="region" aria-labelledby="faq-q7">
          <p>The workflow is designed to minimize the information collected and limit access to the people who need it. ClinicSync does not make legal or compliance certifications. Your team should review privacy and compliance requirements before launch.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a8" id="faq-q8">
            What does it cost?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a8" role="region" aria-labelledby="faq-q8">
          <p>Initial setup starts at $500. An optional care plan is available at $100 per month. Final pricing depends on the requested workflow.</p>
        </div>
      </div>

      <div class="faq-item">
        <h3>
          <button class="faq-q" aria-expanded="false" aria-controls="faq-a9" id="faq-q9">
            What happens after launch?
            <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </h3>
        <div class="faq-a" id="faq-a9" role="region" aria-labelledby="faq-q9">
          <p>You receive a walkthrough of the workflow, your team can test it, and we make reasonable adjustments so the process is clear before handover.</p>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ================================================================
     SECTION 10: FINAL CTA AND CONTACT
================================================================= -->
<section class="section" id="contact" style="background:#fff;">
  <div class="container">

    <div class="final-cta reveal">
      <h2>Make every website inquiry easier to act on.</h2>
      <p>See how ClinicSync could fit into your current website and front-desk workflow.</p>
      <div class="cta-row">
        <a href="INSERT_CALENDLY_OR_BOOKING_LINK" class="btn btn-primary">Book a 10-minute call</a>
        <a href="INSERT_LOOM_OR_VIDEO_LINK" class="btn btn-ghost-on-dark">Watch the 60-second demo</a>
      </div>
    </div>

    <div class="contact-grid">

      <div class="reveal">
        <div class="contact-info-card">
          <h3>Talk to us directly</h3>
          <p style="color:var(--muted); font-size:0.95rem;">Prefer a short call? Pick a time that works for you.</p>

          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v16H4z" fill="none" stroke="none"/><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
            <span>INSERT_CONTACT_EMAIL</span>
          </div>
          <div class="contact-line">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Serving US dental and cosmetic practices remotely.</span>
          </div>

          <!--
          PASTE YOUR CALENDLY EMBED CODE HERE.
          Replace this placeholder with the official Calendly embed code.
          -->
          <div class="calendly-placeholder" id="calendly-placeholder">
            <strong>Calendly scheduler goes here</strong>
            Replace this box with your official Calendly embed code.
          </div>

          <p class="privacy-note">We only use the details you submit to respond to your inquiry. No patient data should be included in this form.</p>
        </div>
      </div>

      <div class="reveal">
        <div class="form-card">
          <h3 style="font-size:1.1rem; font-weight:700; color:var(--navy); margin-bottom:6px;">Send us a message</h3>
          <p style="color:var(--muted); font-size:0.92rem; margin-bottom:var(--space-5);">Tell us a bit about your practice and we'll follow up by email.</p>

          <!--
          CONNECT THIS FORM TO A REAL ENDPOINT BEFORE LAUNCH.
          Possible options:
          - n8n webhook
          - Formspree
          - Netlify Forms
          - Custom backend endpoint
          Never expose private API keys in frontend code.
          -->
          <form id="contactForm" novalidate>
            <div class="field" data-field="name">
              <label for="cf-name">Name <span class="required-mark">*</span></label>
              <input type="text" id="cf-name" name="name" required autocomplete="name" aria-describedby="err-name">
              <p class="error-msg" id="err-name" role="alert">Please enter your name.</p>
            </div>

            <div class="field" data-field="clinic">
              <label for="cf-clinic">Clinic name <span class="required-mark">*</span></label>
              <input type="text" id="cf-clinic" name="clinic" required autocomplete="organization" aria-describedby="err-clinic">
              <p class="error-msg" id="err-clinic" role="alert">Please enter your clinic name.</p>
            </div>

            <div class="field" data-field="email">
              <label for="cf-email">Work email <span class="required-mark">*</span></label>
              <input type="email" id="cf-email" name="email" required autocomplete="email" aria-describedby="err-email">
              <p class="error-msg" id="err-email" role="alert">Please enter a valid email address.</p>
            </div>

            <div class="field" data-field="phone">
              <label for="cf-phone">Phone</label>
              <input type="tel" id="cf-phone" name="phone" autocomplete="tel" aria-describedby="err-phone">
              <p class="error-msg" id="err-phone" role="alert">Please enter a valid phone number.</p>
            </div>

            <div class="field" data-field="message">
              <label for="cf-message">Message <span class="required-mark">*</span></label>
              <textarea id="cf-message" name="message" required aria-describedby="err-message"></textarea>
              <p class="error-msg" id="err-message" role="alert">Please tell us a little about your practice.</p>
            </div>

            <button type="submit" class="btn btn-primary btn-block">Send message</button>
          </form>

          <div class="form-success" id="formSuccess" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            <strong>Thanks — your message has been received.</strong>
            <p style="margin-top:6px; font-size:0.9rem;">We'll follow up at the email address you provided.</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

</main>

<!-- ================================================================
     SECTION 11: FOOTER
================================================================= -->
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-logo">
          <svg class="logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#0EA5A5" fill-opacity="0.15"/>
            <path d="M9 17c0-4 3-7 7-7s7 3 7 7" stroke="#0EA5A5" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <circle cx="9" cy="17" r="2" fill="#22C55E"/>
            <circle cx="23" cy="17" r="2" fill="#0EA5A5"/>
          </svg>
          ClinicSync
        </div>
        <p class="footer-tagline">Capture every website inquiry. Respond instantly. Follow up consistently.</p>
      </div>

      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#what-you-get">What you get</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:INSERT_CONTACT_EMAIL">INSERT_CONTACT_EMAIL</a></li>
          <li><a href="INSERT_CALENDLY_OR_BOOKING_LINK">Book a 10-minute call</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <span>&copy; <span id="copyYear"></span> ClinicSync. All rights reserved.</span>
      <span>This page does not claim HIPAA compliance or provide medical advice.</span>
    </div>
  </div>
</footer>

<script>
(function(){
  "use strict";

  /* ---------------------------------------------------------
     Mobile navigation
  --------------------------------------------------------- */
  var menuToggle = document.getElementById('menuToggle');
  var primaryNav = document.getElementById('primaryNav');
  var navScrim = document.getElementById('navScrim');
  var menuIcon = document.getElementById('menuIcon');

  function openMenu(){
    primaryNav.classList.add('open');
    navScrim.classList.add('show');
    menuToggle.setAttribute('aria-expanded','true');
    menuToggle.setAttribute('aria-label','Close menu');
    menuIcon.innerHTML = '<line x1="4" y1="4" x2="20" y2="20"></line><line x1="20" y1="4" x2="4" y2="20"></line>';
    document.body.style.overflow = 'hidden';
  }
  function closeMenu(){
    primaryNav.classList.remove('open');
    navScrim.classList.remove('show');
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.setAttribute('aria-label','Open menu');
    menuIcon.innerHTML = '<line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line>';
    document.body.style.overflow = '';
  }
  menuToggle.addEventListener('click', function(){
    var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
  });
  navScrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeMenu();
  });
  primaryNav.querySelectorAll('a').forEach(function(link){
    link.addEventListener('click', closeMenu);
  });

  /* ---------------------------------------------------------
     FAQ accordion
  --------------------------------------------------------- */
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = btn.closest('.faq-item');
      var isOpen = item.classList.contains('open');
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------------------------------------------------------
     Dashboard mockup: row selection + tab filtering
  --------------------------------------------------------- */
  var dmRows = Array.prototype.slice.call(document.querySelectorAll('.dm-row'));
  var dmTabs = Array.prototype.slice.call(document.querySelectorAll('.dm-tab'));

  function updateDetail(row){
    document.getElementById('ddName').textContent = row.dataset.name;
    document.getElementById('ddService').textContent = row.dataset.service;
    document.getElementById('ddDate').textContent = row.dataset.date;
    document.getElementById('ddTeam').textContent = row.dataset.team;
    document.getElementById('ddPhone').textContent = row.dataset.phone;
    document.getElementById('ddStatus').textContent = row.dataset.statusLabel;
    document.getElementById('ddNote').textContent = row.dataset.note;
    dmRows.forEach(function(r){ r.classList.remove('active'); });
    row.classList.add('active');
  }

  dmRows.forEach(function(row){
    row.addEventListener('click', function(){ updateDetail(row); });
  });

  dmTabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      dmTabs.forEach(function(t){ t.setAttribute('aria-selected','false'); });
      tab.setAttribute('aria-selected','true');
      var filter = tab.dataset.filter;
      var firstVisible = null;
      dmRows.forEach(function(row){
        var show = (filter === 'all') || (row.dataset.status === filter);
        row.style.display = show ? '' : 'none';
        if(show && !firstVisible) firstVisible = row;
      });
      if(firstVisible) updateDetail(firstVisible);
    });
  });

  /* ---------------------------------------------------------
     Scroll reveal
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------
     Contact form validation (client-side only — no backend)
  --------------------------------------------------------- */
  var form = document.getElementById('contactForm');
  var successBox = document.getElementById('formSuccess');

  function setError(fieldName, hasError){
    var wrap = form.querySelector('[data-field="' + fieldName + '"]');
    if(!wrap) return;
    wrap.classList.toggle('invalid', hasError);
    var input = wrap.querySelector('input, textarea');
    if(input) input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
  }

  function isValidEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
  function isValidPhone(value){
    if(!value) return true; // optional field
    return /^[0-9+()\-.\s]{7,20}$/.test(value);
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim();
    var clinic = form.clinic.value.trim();
    var email = form.email.value.trim();
    var phone = form.phone.value.trim();
    var message = form.message.value.trim();

    var valid = true;

    if(!name){ setError('name', true); valid = false; } else { setError('name', false); }
    if(!clinic){ setError('clinic', true); valid = false; } else { setError('clinic', false); }
    if(!email || !isValidEmail(email)){ setError('email', true); valid = false; } else { setError('email', false); }
    if(!isValidPhone(phone)){ setError('phone', true); valid = false; } else { setError('phone', false); }
    if(!message){ setError('message', true); valid = false; } else { setError('message', false); }

    if(!valid){
      var firstInvalid = form.querySelector('.invalid input, .invalid textarea');
      if(firstInvalid) firstInvalid.focus();
      return;
    }

    /* NOTE: No real submission logic — connect to a real endpoint before launch. */
    form.style.display = 'none';
    successBox.classList.add('show');
  });

  /* ---------------------------------------------------------
     Auto copyright year
  --------------------------------------------------------- */
  document.getElementById('copyYear').textContent = new Date().getFullYear();

})();
</script>

</body>
</html>
```
