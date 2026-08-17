import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import About from '@/components/About';
import Footer from '@/components/Footer';

// ApiOffering (the "Integra API" capability blurbs + the three Trial / API /
// API + Archive pricing boxes) is deliberately NOT rendered here. API pricing
// and plan selection live only in the signed-in console at
// dashboard.integramarkets.app/api-tier, so the marketing page sells the
// product and the dashboard sells the plan. The component is retained rather
// than deleted — /api-tier is where that content belongs if it is reused.

export default function Home() {
  return (
    <main className="min-h-screen bg-black overflow-x-hidden selection:bg-[#4ECCA3] selection:text-black">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <About />
      <Footer />
    </main>
  );
}
