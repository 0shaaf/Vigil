'use client'
import React, { useCallback, useEffect, useState } from "react";
import { createSwitch } from "../actions";
import { readTableData } from "../actions";


export default function Dashboard() {

    const [data, setData] = useState(null);
    useEffect(()=>{
        async function fetchData() {
            const receivedData = await readTableData('switches');
            setData(receivedData.data);
            console.log(receivedData);
        }
        fetchData();
    }, []);

    const handleCreateAction = async () => {
        const errr = await createSwitch();
        if (errr) throw new Error(errr.message);
        else alert("Succesfully Created a row");
    }

    return (<>
        <div className="dashboard">
            <div>
                <h3>Hi, Welcome to DashBoard</h3>
                <p>Click Below to Create a new Row in Database</p>
                <button onClick={handleCreateAction}>Create Row</button>
            </div>
            {
            data && 
            <div className="displayData">
                {
                data.map((row, i)=>{
                    return <div style={{backgroundColor: i%2? "beige" : "pink"}} key={i+3}>{JSON.stringify(row)}</div>
                })
                }
            </div>
            }
        </div>
    </>)
}