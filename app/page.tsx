'use client'
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';

type Message = {
  message: string;
  isLocal: boolean;
  isAI: boolean;
};

export default function Home() {
  const [message, setMessage] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [chat, setChat] = useState<Message[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);

  const userID = useMemo(() => Math.random().toString(36).substring(7), []);
  const AI_USER='OLLAMA';

  useEffect(() => {
    const connectionBuilder = new HubConnectionBuilder()
    .withUrl(process.env.NEXT_PUBLIC_SIGNAL_R_URL ?? '', { headers: { 'Access-Control-Allow-Origin': '*' } })
    .configureLogging(LogLevel.Information)
    .build();
    setConnection(connectionBuilder);
  },[]);

  useEffect(() => { 
    if (connection){
      connection.start().then(() => {
        console.log('Connected to SignalR');
        connection.on('newMessage', (message: string, userId: string) => {
          console.log('Message received: ', message);
          if (message.match(/ollama:/)) { // is localhost
            setIsAIThinking(true);
          }
          const isAI = userId === AI_USER;
          if (isAI){
            setIsAIThinking(false);
          }
          const messageToSend = message.replace(/ollama:/, '');
          setChat((prevChat) => [...prevChat, {message: messageToSend, isLocal: userId === userID, isAI}]);
        });
      }).catch((error: any) => { 
        console.log('Error connecting to SignalR: ', error);
      }
    );
    }
  }
  ,[connection,userID]);

  const onTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onMessageSubmit = async  (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke('SendMessage', message, userID).then(() => {
        setMessage('');
      })
      .then(() => {
        if (message.match(/ollama:/)) { // is localhost
          setIsAIThinking(true);
          return fetch('http://localhost:11434/api/generate',{ 
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama3', 
                prompt: message.replace(/ollama:/, 'envia respuesta entre parrafos sin formato'),
                stream: false,
              })
            })
          }
        })
        .then(res => {
          if (res){
            return res.json();
          }
        })
        .then(result => 
          {
            connection.invoke('SendMessage', result.response, AI_USER);
            setIsAIThinking(false);
          }
      )
      .catch((error: any) => {
        console.log('Error sending message: ', error);
      });
    }

  };

  let isLocalhost = null;
  if (typeof window !== "undefined"){
    isLocalhost = window?.location?.hostname === 'localhost';
  }

  return (
    <div>
      <h1>Chat Application</h1>
      <form className='chat-container' onSubmit={onMessageSubmit}>
        <section className="messages-container">
          {chat.map(({message, isLocal, isAI}) => (
            <div className={isLocal ? 'message mine': isAI ? 'message ai': 'message'} key={Math.random().toString(36).substring(7)}>{message}</div>
          ))}
        </section>
        {isAIThinking && <div className='loading origin-center rotate-180'/>}
        <section className='chat-input'>
          <input
            disabled={!!isLocalhost}
            name="message"
            type='text'
            autoComplete='off'
            onChange={onTextChange}
            value={message}
            placeholder="Enter message..."
            />
          <button disabled={!!isLocalhost} className='send-message'>Send</button>
          </section>
      </form>
    </div>
  );
}