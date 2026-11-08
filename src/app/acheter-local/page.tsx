import { redirect } from "next/navigation";

export default function BuyLocalPage() {
  redirect("/?type=LOCAL");
}
