import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import LicenseBanner from "@/components/LicenseBanner";
import SmoothScroll from "@/components/SmoothScroll";
import GrainOverlay from "@/components/GrainOverlay";
import CursorFollower from "@/components/CursorFollower";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LicenseBanner />
      <SmoothScroll />
      <GrainOverlay />
      <CursorFollower />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
