export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own layout without sidebar
  return <>{children}</>;
}
