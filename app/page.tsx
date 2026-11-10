import { Hero } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { Features, Footer, ForStudents, HowItWorks, SubjectMarquee } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <SubjectMarquee />
        <HowItWorks />
        <Features />
        <ForStudents />
      </main>
      <Footer />
    </>
  );
}
