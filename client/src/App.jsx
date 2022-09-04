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
  const [arrivalMessage, setArrivalMessage] = useState(null);
  
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

  }, [socket, onlineUsers, selectedUser]);

  useEffect(() => {
    socket.on("private message", ({ content, from, id }) => {
      setArrivalMessage({
        content,
        from,
        id,
        fromSelf: false
      })
    });
  }, [])

  useEffect(() => {
    const newArray = onlineUsers.map(user => {
      if(user.userID === selectedUser.userID) {
        user.hasNewMessage = false;
        return user
      }
      return user;
    })

    setOnlineUsers(newArray);
  },[selectedUser])

  useEffect(() => {
    if (arrivalMessage
    && onlineUsers.some(({ userID }) => userID === arrivalMessage.from)) {
      const indexUser = onlineUsers.findIndex(({ userID }) => userID === arrivalMessage.from);
      const userObj = onlineUsers.find(({ userID }) => userID === arrivalMessage.from);
      userObj.messages.push(arrivalMessage);

      if (!(checkSelectedUser(userObj)) && !(userObj.hasNewMessage)) {
        userObj.hasNewMessage = true;
      }

      const newArray = [...onlineUsers];
      newArray.splice(indexUser, 1 , userObj);
      setOnlineUsers(newArray);
    }
  }, [arrivalMessage])

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
