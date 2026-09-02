import {createServerClient} from "@supabase/ssr"
import { cookies } from "next/headers";


function getEnvironmentVariables(){
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if(!supabaseUrl || !supabaseAnonKey){
        throw new Error("Missing Either Key or URL");
    }

    return {supabaseUrl , supabaseAnonKey};
}

export async function createSupabaseServerClient(){
    const {supabaseUrl , supabaseAnonKey} = getEnvironmentVariables();
    const cookieStore = await cookies();

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies : {
                getAll(){
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet){
                    try{
                        cookiesToSet.forEach((name , value , option)=>{
                            cookieStore.set(name , value  , option);
                        })
                    }
                    catch(error){
                        console.log(error);
                    }
                }
                
            }
        }
    )
}
