import type React from "react";

export type IconName = "trash" | "spark" | "folder" | "bulb" | "arrow" | "plus" | "chevron" | "play" | "image" | "mic" | "check" | "back" | "eye" | "pen" | "repeat" | "hand" | "compass";

export const photos = [
  { url: "https://images.unsplash.com/photo-1729179664878-49b8cc390d2b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200", alt: "Abstract multicolored building facade", credit: "Steve A Johnson" },
  { url: "https://images.unsplash.com/photo-1764007022081-01b34518e2c2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200", alt: "Colorful beach huts receding into the distance", credit: "the iop" },
  { url: "https://images.unsplash.com/photo-1579963824410-69e7079bef9d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200", alt: "Colorful abstract painting", credit: "Roger Bradshaw" },
];

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
    spark: <path d="m12 2 1.2 4.2L17 8l-3.8 1.8L12 14l-1.2-4.2L7 8l3.8-1.8L12 2ZM5 14l.7 2.3L8 17.5l-2.3 1.2L5 21l-.7-2.3L2 17.5l2.3-1.2L5 14Z" />,
    folder: <path d="M3 6.5h6l2-2h3l2 2h5v12H3v-12Z" />,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M8.2 14.7A7 7 0 1 1 15.8 14.7c-.8.5-.8 1.3-.8 2.3H9c0-1 0-1.8-.8-2.3Z" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    play: <path d="m9 7 8 5-8 5V7Z" />,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 3 3 3-4 5 6" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    check: <path d="m5 12 4 4 10-10" />,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    pen: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
    repeat: <><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>,
    hand: <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1.5v-2a1.5 1.5 0 0 1 3 0V12m0-1a1.5 1.5 0 0 1 3 0v4.5A6.5 6.5 0 0 1 10.5 22h-.3a6 6 0 0 1-4.6-2.2L3 16.5a1.6 1.6 0 0 1 2.4-2.1L8 17" />,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  };
  return (
    <svg aria-hidden="true" className="shrink-0" fill={name === "spark" || name === "play" ? "currentColor" : "none"} height={size} viewBox="0 0 24 24" width={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
      {paths[name]}
    </svg>
  );
}

export function AppButton({ children, className = "", type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`app-button ${className}`} type={type} {...props}>{children}</button>;
}
