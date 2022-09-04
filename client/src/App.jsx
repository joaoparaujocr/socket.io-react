import { useState } from 'react'
import './App.css'
import io from "socket.io-client";
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiAlertCircle } from 'react-icons/fi'

const URL = "http://localhost:3001";
const socket = io(URL, { autoConnect: false });

function App() {
  const [usernameAlreadySelected, setUsernameAlreadySelected ] = useState("")
  const [usernameValue, setUserNameValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [arrivalMessage, setArrivalMessage] = useState()
  
  const sendUsername = () => {
    setUsernameAlreadySelected(usernameValue);
    socket.auth = { username: usernameValue };
    socket.connect()
  }

  const selectUser = (user) => {
    setSelectedUser(user);
  }

  const submitMessage = () => {
    if (selectedUser && messageContent) {
      const objData = {
        content: messageContent,
        to: selectedUser.userID,
        id: uuidv4(),
      }
      socket.emit("private message", objData);
      const userIndex = onlineUsers.findIndex(user => user.userID === selectedUser.userID);
      const userSent = onlineUsers.find(user => user.userID === selectedUser.userID);

      objData.fromSelf = true
      userSent.messages.push(objData);
      const newOnlineUsers = onlineUsers.filter(user => user.userID !== selectedUser.userID)

      newOnlineUsers.splice(userIndex, 0, userSent);
      setOnlineUsers(newOnlineUsers);
    }
  }

  const checkSelectedUser = (user) => {
    return user.username === selectedUser?.username;
  }

  const returnOnUsers = () => onlineUsers;

  useEffect(() => {
    socket.on("users", (users) => {
      const usersFormat = users.map(user => {
        user.messages = [];
        user.hasNewMensage = false;
        return user;
      })
      setOnlineUsers(usersFormat);
    });
  },[])

  useEffect(() => {
    socket.on("user connected", (user) => {
      const userExisting = onlineUsers.find(({ userID }) => user.userID === userID);
      if (onlineUsers.length !== 0 && !userExisting) {
        user.messages = [];
        user.hasNewMensage = false;
        setOnlineUsers([...onlineUsers, user]);
      };
    });

    socket.on("user disconnected", (id) => {
      const userExisting = onlineUsers.filter(({ userID }) => userID !== id);
      setOnlineUsers([...userExisting]);
    })

    socket.on("connect_error", (err) => {
      if (err.message === "invalid username") {
        console.log("usuario invalido")
      }
    });

    socket.on("private message", ({ content, from, id }) => {
      for (let i = 0; i < onlineUsers.length; i++) {
        const hasMessage = onlineUsers[i].messages.some(mes => {
          return mes.id === id;
        });
        const user = onlineUsers[i];
        if (user.userID === from && !(hasMessage)) {
          user.messages.push({
            content,
            fromSelf: false,
            id
          });
          if (!(checkSelectedUser(user)) && !(user.hasNewMessage)) {
            user.hasNewMessage = true;
          }
          const newArray = onlineUsers.filter((_, index)  => index !== i);
          newArray.splice(i, 0, user);
          setOnlineUsers(newArray);
          break;
        }
      }
    });
  }, [socket, onlineUsers, selectedUser]);

  return (
    <div className="App">
      {!usernameAlreadySelected ? (
        <div className='boxUser'>
          <input onChange={e => setUserNameValue(e.target.value)} />
          <button onClick={sendUsername} >Send user</button>
        </div>
      ) : (
        <>
          <div className='divUsers'>
            <ul>
              {onlineUsers?.map(user => {
                return !(usernameAlreadySelected === user.username) && (<li onClick={() => selectUser(user)} key={user.userID}>{user.username} {user.hasNewMessage ? (<FiAlertCircle />) : ""}</li>) 
              })}
            </ul>
          </div>
          <div className='divMessages'>
            <ul>
              {selectedUser ? selectedUser.messages.map((mes) => {
                return (
                  <li key={mes.id} className={mes.fromSelf ? 'you' : ''}>{mes.content}</li>
                )
              }) : (
                <></>
              )}
            </ul>
            {selectedUser && (
              <div className='controlMsg'>
                <input type="text" onChange={e => setMessageContent(e.target.value)} />
                <button onClick={submitMessage}>Enviar Mensagem</button>
              </div>
              )}
          </div>
        </>
      )}

    </div>
  )
}

export default App
