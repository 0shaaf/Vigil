"use client";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
    readTableData,
    createContact,
    removeContact,
    updateContact,
    removeSwitch,
} from "../actions";
import "./switches.css";
import { useRouter } from "next/navigation";

export default function Switches() {
  const [tableData, setTableData] = useState(null);
  const [formActive, setFormActive] = useState(false);
  const [editActive, setEditActive] = useState(false);
  const activeContactRef = useRef({
    id: null,
    contact_name: null,
    email: null,
  });

  useEffect(() => {
    const getData = async () => {
      const {error, data} = await readTableData("switches");
      if(error){
        console.log("Error Fetching Data" , error);
      }
      else{
        setTableData(data);
      }
    };
    getData();
  }, []);

  const router = useRouter();
  const navigateToCreation = useCallback(async ()=>{
      router.push("/switches/create");
})

  const fetchData = useCallback(() => {
    const getData = async () => {
       const {error, data} = await readTableData("switches");
      if(error){
        console.log("Error Fetching Data" , error);
      }
      else{
        setTableData(data);
      }
    };
    getData();
  });

  const deleteSwitch = async (id)=>{
    const error = await removeSwitch(id);
    if(!error){
      fetchData();
    }
    else console.log("Error Deleting Switch" , error);
  }

  const reRoute = useCallback(async (swID)=>{
    router.push(`/switches/${swID}`);
  })

  return (
    <>
      <section className="contactBook">
        <nav>
          <h2 className="heading">All Switches</h2>
          <button
            className="create-btn"
            onClick={() => {
              navigateToCreation();
            }}
          >
            Create New
          </button>
        </nav>
        <div className="displayTable">
          {tableData && (
            <table>
              <thead>
                <tr>
                  {/* <th>ID</th> */}
                  <th>Name</th>
                  <th>Created At</th>
                  <th>Check-In Interval</th>
                  <th>Last Check-In</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((sw, ind) => {
                  return (
                    <tr key={ind * 5}>
                      <td>{sw.name}</td>
                      <td>{sw.created_at.slice(0, 10)}</td>
                      <td>{`${sw.check_in_interval.months}m ${sw.check_in_interval.days}d ${sw.check_in_interval.hours}h`}</td>
                      <td>{sw.last_check_in}</td>
                      <td className="remove-contact-btn" onClick={()=>{
                        deleteSwitch(sw.id);
                      }}>X</td>
                      <td className="remove-contact-btn" onClick={()=>reRoute(sw.id)}>EDIT</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
