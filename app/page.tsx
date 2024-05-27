"use client"
import { HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr';
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {HubConnectionBuilder}  from '@microsoft/signalr';

type Message = {
  message: string;
  isLocal: boolean;
};

export default function Home() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<Message[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);

  const userID = useMemo(() => Math.random().toString(36).substring(7), []);

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
          setChat((prevChat) => [...prevChat, {message, isLocal: userId === userID}]);
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
      
      connection.invoke('SendMessage', message, userID).then(() => {
        setMessage('');
      })
      .catch((error: any) => {
        console.log('Error sending message: ', error);
      });
    }

  };

  return (
    <div>
      <h1>Chat Application</h1>
      <form onSubmit={onMessageSubmit}>
        <input
          name="message"
          onChange={onTextChange}
          value={message}
          placeholder="Enter message..."
        />
        <button>Send</button>
      </form>
      <div>
        {chat.map(({message,isLocal}) => (
          <div className={isLocal ? 'bg-green-200 text-right': 'bg-blue-200 text-left'} key={message}>{message}</div>
        ))}
      </div>
    </div>
  );
}