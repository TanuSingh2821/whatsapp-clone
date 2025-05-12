import React, { useEffect, useState, useRef } from "react";
import ChatList from "./Chatlist/ChatList";
import Empty from "./Empty";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/utils/FirebaseConfig";
import { CHECK_USER_ROUTE, GET_MESSAGES_ROUTE, HOST } from "@/utils/ApiRoutes";
import { useRouter } from "next/router";
import { useStateProvider } from "@/context/StateContext";
import { reducerCases } from "@/context/constants";
import Chat from "./Chat/Chat";
import { io } from "socket.io-client";
import SearchMessages from "./Chat/SearchMessages";
import VideoCall from "./Call/VideoCall";
import VoiceCall from "./Call/VoiceCall";
import IncomingVideoCall from "./common/IncomingVideoCall";
import IncomingCall from "./common/IncomingCall";

function Main() {
  const router = useRouter();
  const [
    {
      userInfo,
      currentChatUser,
      messagesSearch,
      videoCall,
      voiceCall,
      incomingVoiceCall,
      incomingVideoCall,
    },
    dispatch,
  ] = useStateProvider();

  const socket = useRef();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [redirectLogin, setRedirectLogin] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) {
        setRedirectLogin(true);
      } else if (!userInfo && currentUser.email) {
        try {
          const { data } = await axios.post(CHECK_USER_ROUTE, {
            email: currentUser.email,
          });

          if (!data.status) {
            router.push("/login");
          } else {
            const { id, name, email, profilePicture: profileImage, status } = data.data;
            dispatch({
              type: reducerCases.SET_USER_INFO,
              userInfo: {
                id,
                name,
                email,
                profileImage,
                status,
              },
            });
          }
        } catch (err) {
          console.error("Network error or other issue: ", err);
          alert("Something went wrong. Please check your network connection or try again later.");
          router.push("/login");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize socket and register events
  useEffect(() => {
    if (userInfo && !socketInitialized) {
      socket.current = io(HOST);
      socket.current.emit("add-user", userInfo.id);
      dispatch({ type: reducerCases.SET_SOCKET, socket });

      socket.current.on("msg-receive", (data) => {
        dispatch({
          type: reducerCases.ADD_MESSAGE,
          newMessage: { ...data.message },
        });
      });

      socket.current.on("incoming-voice-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VOICE_CALL,
          incomingVoiceCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("incoming-video-call", ({ from, roomId, callType }) => {
        dispatch({
          type: reducerCases.SET_INCOMING_VIDEO_CALL,
          incomingVideoCall: { ...from, roomId, callType },
        });
      });

      socket.current.on("voice-call-rejected", () => {
        dispatch({ type: reducerCases.END_CALL });
      });

      socket.current.on("video-call-rejected", () => {
        dispatch({ type: reducerCases.END_CALL });
      });

      socket.current.on("online-users", ({ onlineUsers }) => {
        dispatch({ type: reducerCases.SET_ONLINE_USERS, onlineUsers });
      });

      setSocketInitialized(true);
    }
  }, [userInfo]);

  // Fetch messages when current chat user changes
  useEffect(() => {
    const getMessages = async () => {
      try {
        const { data } = await axios.get(
          `${GET_MESSAGES_ROUTE}/${userInfo.id}/${currentChatUser.id}`
        );
        dispatch({ type: reducerCases.SET_MESSAGES, messages: data.messages });
      } catch (err) {
        console.error("Failed to get messages", err);
      }
    };

    if (currentChatUser?.id && userInfo?.id) {
      getMessages();
    }
  }, [currentChatUser]);

  useEffect(() => {
    if (redirectLogin) router.push("/login");
  }, [redirectLogin]);

  return (
    <>
      {incomingVideoCall && <IncomingVideoCall />}
      {incomingVoiceCall && <IncomingCall />}

      {videoCall ? (
        <div className="h-screen w-screen max-h-full overflow-hidden">
          <VideoCall />
        </div>
      ) : voiceCall ? (
        <div className="h-screen w-screen max-h-full overflow-hidden">
          <VoiceCall />
        </div>
      ) : (
        <div className="grid grid-cols-main h-screen w-screen max-h-screen max-w-full overflow-hidden">
          <ChatList />
          {currentChatUser ? (
            <div className={messagesSearch ? "grid grid-cols-2" : "grid-cols-2"}>
              <Chat />
              {messagesSearch && <SearchMessages />}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </>
  );
}

export default Main;
