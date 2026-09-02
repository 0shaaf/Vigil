'use client'
import React, { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/browser-client";
import {useRouter} from "next/navigation";
import "../login-email/demo.css"

export default function Login(user){    

    const [status , setStatus] = useState("");
    const [currentUser , setCurrentUser] = useState(user);


    const sp_BrowserClient = getSupabaseBrowserClient();

    const router = useRouter();
    const handleSignIn = async (e)=>{
        e.preventDefault();
        const {error, data} = await sp_BrowserClient.auth.signInWithOAuth({
            provider:  "google",
            options:  {
                redirectTo : `${window.location.origin}/welcome`,
                skipBrowserRedirect : false
            }
        });

        if(error) setStatus(error.message);
    }

    const handleSignOut = async ()=>{
        await sp_BrowserClient.auth.signOut();
        setCurrentUser(null);
        setStatus("Signed out succesfully");
        router.push("/")
    }


    useEffect(()=>{
        const {data : listener} = sp_BrowserClient.auth.onAuthStateChange(
        (_event , session)=>{
            setCurrentUser(session?.user ?? null);
        })
        return ()=>{
            listener?.subscription.unsubscribe();
        }
    }, [sp_BrowserClient]);




    return <>
    {
        !currentUser && 
    <form>
        <button onClick={handleSignIn}>Login With Google</button>
        <div>
            Status : {status},
        </div>
    </form>
    }
    {
        currentUser && 
        <div className="userData">
            User Data : 
            <div className="name">Name : {currentUser.name}</div>
            <div className="id">ID : {currentUser.id}</div>
            <button onClick={handleSignOut}>Sign Out</button>
        </div>
    }
    </>
}