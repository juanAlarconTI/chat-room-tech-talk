"use client"
import { HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr';
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {HubConnectionBuilder}  from '@microsoft/signalr';

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
          setChat((prevChat) => [...prevChat, {message, isLocal: userId === userID, isAI: userId === AI_USER}]);
        });
      }).catch((error: any) => { 
        console.log('Error connecting to SignalR: ', error);
      }
    );
    }
  }
  ,[connection]);

  const onTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onMessageSubmit = async  (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (connection?.state === HubConnectionState.Connected) {
      const messageToSend = message.replace(/ollama:/, '')
      connection.invoke('SendMessage', messageToSend, userID).then(() => {
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
                prompt: messageToSend,
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

  const isLocalhost = window?.location?.hostname === 'localhost';

  return (
    <div>
      <h1>Chat Application</h1>
      <form className='chat-container' onSubmit={onMessageSubmit}>
        {chat.map(({message, isLocal, isAI}) => (
          <div className={isLocal ? 'message mine': isAI ? 'message ai': 'message'} key={Math.random().toString(36).substring(7)}>{message}</div>
        ))}
        <div className='loading'/>
        <section className='chat-input'>
          <input
            name="message"
            type='text'
            autoComplete='off'
            onChange={onTextChange}
            value={message}
            placeholder="Enter message..."
            />
          <button disabled={!isLocalhost} className='send-message'>Send</button>
          </section>
      </form>
    </div>
  );
}