'use client'
import React, { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase/browser-client";
import "./demo.css"

export default function Login(user){    

    const [mode, setMode] = useState("signup");
    const [status , setStatus] = useState("");
    const email = useRef("");
    const password = useRef("");
    const [currentUser , setCurrentUser] = useState(user);


    const sp_BrowserClient = getSupabaseBrowserClient();

    const handleSubmit = async (e)=>{
        console.log("Logging in...");
        e.preventDefault();
        

        if(mode == "signup"){
            const {error , data} = await sp_BrowserClient.auth.signUp({
                email : email.current,
                password : password.current,
                options: {
                    emailRedirectTo : `${window.location.origin}/welcome`
                }
            })
            if(error) setStatus(error.message);
            else setStatus("Check your email inbox");

            console.log(data);
        }
        else{
            const {error} = await sp_BrowserClient.auth.signInWithPassword({email : email.current, password : password.current});
            if(error) setStatus(error.message);
            else setStatus("Signed in succesfully");
        }
    }

    const handleSignOut = async ()=>{
        await sp_BrowserClient.auth.signOut();
        setCurrentUser(null);
        setStatus("Signed out succesfully");
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
    <form onSubmit={handleSubmit}>
        <div style={{display:"flex", flexDirection:"column", width: "20vw", gap: "20px"}}>
            <input type="email"  required  onChange={(e)=>{email.current = e.target.value}}/>
            <input type="password"  required onChange={(e)=>{password.current = e.target.value}}/>
            <input type="submit" />
        </div>
        <div className="dock">
            <button className={`btn ${mode == "signup" ? "active" : ""}`} onClick={()=>setMode("signup")}>Sign UP</button>
            <button className={`btn ${mode == "signin" ? "active" : ""}`} onClick={()=>setMode("signin")}>Sign IN</button>
        </div>
        <div>
            Status : {status}
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