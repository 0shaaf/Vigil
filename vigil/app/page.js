'use client'
import Image from "next/image";
import styles from "./page.module.css";
import {useRouter} from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";


export default function Home() {
  const router = useRouter();
  const handleClick = ()=>{
    router.push("/login-email");
  }
  const handleGoogleClick = ()=>{
    router.push("/google-login");
  }
  

  return (
      <main className={styles.main}>
        <button className="btn-main" onClick={handleClick}>Login With Email</button>
        <button className="btn-main" onClick={handleGoogleClick}>Login With Google</button>     
      </main>
  );
}
