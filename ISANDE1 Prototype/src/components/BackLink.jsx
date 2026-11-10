import { Link } from "react-router-dom";

export default function BackLink({ to, children, replace }) {
  return (
    <Link to={to} replace={replace}
      className="inline-flex min-h-11 items-center gap-2 rounded-card px-2 text-base font-semibold text-amber hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber">
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
