import { initials } from "@/lib/format";

// A small round avatar: uses the Google profile image if present, else initials.
export function Avatar({
  name,
  email,
  image,
  size = 32,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
}) {
  const dim = { width: size, height: size };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name ?? "avatar"}
        style={dim}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: size * 0.4 }}
      className="rounded-full bg-accent-tint text-accent flex items-center justify-center font-semibold shrink-0"
    >
      {initials(name, email)}
    </div>
  );
}
