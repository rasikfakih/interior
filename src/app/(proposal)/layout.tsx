/**
 * Public proposal route group. Deliberately separate from (public):
 * proposal links are shareable, brand-forward documents that must not
 * carry the marketing navbar/footer or the public layout's overlays.
 * The root layout still applies (fonts, theme vars, providers).
 */
export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
