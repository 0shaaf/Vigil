import Login from "./googleDemo.jsx";
import { createSupabaseServerClient } from "../lib/supabase/server-client";

export default async function GoogleLogin(){
    const supabase = await createSupabaseServerClient();
    const {data : {user},} = await supabase.auth.getUser();
    console.log({user});
    return <Login user={user}/>;
}