import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import ApiOffering from '@/components/ApiOffering';
import HowItWorks from '@/components/HowItWorks';
import About from '@/components/About';
import Footer from '@/components/Footer';

// ApiOffering now renders the capability cards only (REST API, Historical
// Archive, Webhooks, Key Management). The three pricing tiers and their CTAs
// were removed from it — plan selection lives only in the signed-in console at
// dashboard.integramarkets.app/api-tier.

export default function Home() {
  return (
    <main className="min-h-screen bg-black overflow-x-hidden selection:bg-[#4ECCA3] selection:text-black">
      <Header />
      <Hero />
      <Features />
      <ApiOffering />
      <HowItWorks />
      <About />
      <Footer />
    </main>
  );
}
