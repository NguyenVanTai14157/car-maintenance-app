import Link from "next/link";
export default function NotFound() {
  return (
    <div className="not-found">
      <p className="eyebrow">AUTOCARE ADMIN</p>
      <h1>Không tìm thấy trang</h1>
      <p>Trang bạn đang mở không còn tồn tại.</p>
      <Link href="/">Về tổng quan →</Link>
    </div>
  );
}
