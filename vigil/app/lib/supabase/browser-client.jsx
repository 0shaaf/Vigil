'use client'
import { createBrowserClient } from "@supabase/ssr"

function getEnvironmentVariables(){
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if(!supabaseUrl || !supabaseAnonKey){
        throw new Error("Missing Either Key or URL");
    }

    return {supabaseUrl , supabaseAnonKey};
}


export function getSupabaseBrowserClient(){

    const {supabaseUrl , supabaseAnonKey} = getEnvironmentVariables();

    const client  = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return client;
}