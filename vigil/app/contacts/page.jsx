"use client";
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import "./contactBook.css";
import {
  readTableData,
  createContact,
  removeContact,
  updateContact,
} from "../actions";
import { useForm } from "react-hook-form";

function CreationMenu({ setFormActive, fetchData }) {
  const {
    register,
    handleSubmit,
    formState: { errors, data },
    reset,
  } = useForm({
    defaultValues: {
      contact_name: "",
      email: "",
    },
  });

  async function onButtonClick(data) {
    const error = await createContact(data.contact_name, data.email);
    if (error) {
      console.log(error);
    } else {
      setFormActive(false);
      fetchData();
      alert("Contact Created Succesfully");
    }
  }

  return (
    <>
      <div className="contact-creation-menu"
      onClick={(e)=>{e.stopPropagation()}}>
        <div className="overlay" onClick={()=>setFormActive(false)}></div>
        <form
          action=""
          onSubmit={handleSubmit(onButtonClick)}
          className="contact-form"
        >
          <div className="input-group">
            <label>Name</label>
            <input
              {...register("contact_name", {
                required: "This Field is mandatory",
              })}
            />
            {errors.contact_name && <p>{errors.contact_name.message}</p>}
          </div>
          <div className="input-group">
            <label>Email</label>
            <input
              {...register("email", {
                required: "This Field is mandatory",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email address",
                },
              })}
            />
            {errors.email && <p>{errors.email.message}</p>}
          </div>
          <input type="submit" className="submit-btn" value="Create" />
        </form>
      </div>
    </>
  );
}

function EditMenu({ contactData, setEditActive, fetchData }) {
  const {
    register,
    handleSubmit,
    formState: { errors, data },
    reset,
  } = useForm({
    defaultValues: {
      contact_name: contactData.contact_name,
      email: contactData.email,
    },
  });

  async function onButtonClick(data) {
    const error = await updateContact(
      contactData.id,
      data.contact_name,
      data.email,
    );
    if (error) {
      console.log(error);
    } else {
      setEditActive(false);
      fetchData();
      alert("Contact Updated Succesfully");
    }
  }

  return (
    <>
      <div className="contact-creation-menu" 
      onClick={(e)=>{e.stopPropagation()}}>
        <div className="overlay" onClick={()=>setEditActive(false)}></div>
        <form
          action=""
          onSubmit={handleSubmit(onButtonClick)}
          className="contact-form"
        >
          <div className="input-group">
            <label>Name</label>
            <input
              {...register("contact_name", {
                required: "This Field is mandatory",
              })}
            />
            {errors.contact_name && <p>{errors.contact_name.message}</p>}
          </div>
          <div className="input-group">
            <label>Email</label>
            <input
              {...register("email", {
                required: "This Field is mandatory",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email address",
                },
              })}
            />
            {errors.email && <p>{errors.email.message}</p>}
          </div>
          <input type="submit" className="submit-btn" value="Create" />
          <button
            className="submit-btn cancel-btn"
            onClick={() => setEditActive(false)}
          >
            Cancel
          </button>
        </form>
      </div>
    </>
  );
}

export default function ContactBook() {
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
      const {error, data} = await readTableData("contacts");
      if(error){
        console.log("Error Fetching Data" , error);
      }
      else{
        setTableData(data);
      }
    };
    getData();
  }, []);

  const fetchData = useCallback(() => {
    const getData = async () => {
       const {error, data} = await readTableData("contacts");
      if(error){
        console.log("Error Fetching Data" , error);
      }
      else{
        setTableData(data);
      }
    };
    getData();
  });

  const deleteContact = async (id)=>{
    const error = await removeContact(id);
    if(!error){
      fetchData();
    }
    else console.log("Error Deleting Contact" , error);
  }

  return (
    <>
      <section className="contactBook">
        <nav>
          <h2 className="heading">Your Contacts</h2>
          <button
            className="create-btn"
            onClick={() => {
              setFormActive(true);
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
                  <th>Contact Name</th>
                  <th>Email</th>
                  <th>Remove</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((contact, ind) => {
                  return (
                    <tr key={ind * 5}>
                      {/* <td>{contact.id}</td> */}
                      <td>{contact.contact_name}</td>
                      <td>{contact.email}</td>
                      <td
                        className="remove-contact-btn"
                        onClick={()=>deleteContact(contact.id)}
                      >
                        X
                      </td>
                      <td
                        onClick={() => {
                          activeContactRef.current = {
                            id: contact.id,
                            contact_name: contact.contact_name,
                            email: contact.email,
                          };
                          setEditActive(true);
                        }}
                      >
                        EDIT
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {formActive && (
          <CreationMenu setFormActive={setFormActive} fetchData={fetchData} />
        )}
        {editActive && (
          <EditMenu
            contactData={activeContactRef.current}
            setEditActive={setEditActive}
            fetchData={fetchData}
          />
        )}
      </section>
    </>
  );
}
