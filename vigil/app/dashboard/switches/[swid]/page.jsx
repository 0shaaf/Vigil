import { getSwitchByID } from "@/app/actions/data"

export default async function EditSwitch(){
    const {error , data} = await getSwitchByID(12);

    return <>
    {JSON.stringify(data)}
    </>
}