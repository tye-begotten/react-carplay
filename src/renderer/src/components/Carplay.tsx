import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RotatingLines } from 'react-loader-spinner'
//import './App.css'
import {
  findDevice,
  requestDevice,
  CommandMapping,
} from 'node-carplay/web'
import { CarPlayWorker } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'
import { useLocation, useNavigate } from "react-router-dom";
import { ExtraConfig} from "../../../main/Globals";
import { useCarplayStore, useStatusStore } from "../store/store";
import { InitEvent } from './worker/render/RenderEvents'
import { Typography } from "@mui/material";
import { Tyefi, TyefiMessageNames } from './Tyefi'

const width = window.innerWidth
const height = window.innerHeight

const videoChannel = new MessageChannel()
const micChannel = new MessageChannel()

const RETRY_DELAY_MS = 15000



interface CarplayProps {
  receivingVideo: boolean
  setReceivingVideo: (receivingVideo: boolean) => void
  settings: ExtraConfig,
  command: string,
  commandCounter: number
}

function Carplay({ receivingVideo, setReceivingVideo, settings, command, commandCounter }: CarplayProps) {
  const [isPlugged, setPlugged] = useStatusStore(state => [state.isPlugged, state.setPlugged])
  const [deviceFound, setDeviceFound] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  )
  const mainElem = useRef<HTMLDivElement>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stream = useCarplayStore(state => state.stream)
  const config = {
    fps: settings.fps,
    width: width,
    height: height,
    mediaDelay: settings.mediaDelay
  }
  // const pathname = "/"
  console.log(`pathname=${pathname}`)

  var tyefi = null;

  // try {
  //   console.log("initializing tyefi socket")
  //   tyefi = new Tyefi(settings)

  //   tyefi.on(TyefiMessageNames.VolChange, (volume: number) => {
  //     changeVolume(volume)
  //   })

  //   tyefi.on(TyefiMessageNames.Stop, () => {
  //     stop()
  //   })
  // } catch (ex) {
  //   console.log(`ERROR INITIALIZING TYEFI: ${ex}`)
  //   console.error(ex)
  // }

  const renderWorker = useMemo(() => {
    if (!canvasElement) return

    const worker = new Worker(
      new URL('./worker/render/Render.worker.ts', import.meta.url), {type: 'module'},
    )
    const canvas = canvasElement.transferControlToOffscreen()
    worker.postMessage(new InitEvent(canvas, videoChannel.port2), [
      canvas,
      videoChannel.port2,
    ])
    return worker
  }, [canvasElement])

  useLayoutEffect(() => {
    if (canvasRef.current) {
      setCanvasElement(canvasRef.current)
    }
  }, [])

  const carplayWorker = useMemo(() => {
    const worker = new Worker(
      new URL('./worker/CarPlay.worker.ts', import.meta.url),
      {type: 'module'}
    ) as CarPlayWorker
    const payload = {
      videoPort: videoChannel.port1,
      microphonePort: micChannel.port1,
    }
    worker.postMessage({ type: 'initialise', payload }, [
      videoChannel.port1,
      micChannel.port1,
    ])
    return worker
  }, [])

  const { processAudio, getAudioPlayer, startRecording, stopRecording, changeVolume, play, stop } =
    useCarplayAudio(carplayWorker, micChannel.port2, settings)

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])



  // subscribe to worker messages
  useEffect(() => {
    carplayWorker.onmessage = (ev) => {
      const { type } = ev.data
      switch (type) {
        case 'plugged':
          setPlugged(true)
          if(settings.piMost && settings?.most?.stream) {
            console.log("setting most stream")
            stream(settings.most.stream)
          }
          break
        case 'unplugged':
          setPlugged(false)
          break
        case 'requestBuffer':
          clearRetryTimeout()
          getAudioPlayer(ev.data.message)
          break
        case 'audio':
          clearRetryTimeout()
          processAudio(ev.data.message)
          break
        case 'media':
          //TODO: implement
          break
        case 'command':
          const {
            message: { value }
          } = ev.data
          switch (value) {
            case CommandMapping.startRecordAudio:
              startRecording()
              break
            case CommandMapping.stopRecordAudio:
              stopRecording()
              break
            case CommandMapping.requestHostUI:
              navigate('/settings')
          }
          break
        case 'failure':
          if (retryTimeoutRef.current == null) {
            console.error(
              `Carplay initialization failed -- Reloading page in ${RETRY_DELAY_MS}ms`,
            )
            retryTimeoutRef.current = setTimeout(() => {
              window.location.reload()
            }, RETRY_DELAY_MS)
          }
          break
      }
    }
  }, [carplayWorker, clearRetryTimeout, getAudioPlayer, processAudio, renderWorker, 
      startRecording, stopRecording, changeVolume, play, stop])

  useEffect(() => {
    const element = mainElem?.current
    if(!element) return;
    const observer = new ResizeObserver(() => {
      console.log("size change")
      carplayWorker.postMessage({type: 'frame'})
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, []);

  useEffect(() => {
    carplayWorker.postMessage({type: 'keyCommand', command: command})
  }, [commandCounter]);

  const checkDevice = useCallback(
    async (request: boolean = false) => {
      const device = request ? await requestDevice() : await findDevice()
      if (device) {
        console.log('starting in check')
        setDeviceFound(true)
        setReceivingVideo(true)
        carplayWorker.postMessage({ type: 'start', payload: {config} })
      } else {
        setDeviceFound(false)
      }
    },
    [carplayWorker]
  )

  // usb connect/disconnect handling and device check
  useEffect(() => {
    navigator.usb.onconnect = async () => {
      checkDevice()
    }

    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
        setDeviceFound(false)
      }
    }

    //checkDevice()
  }, [carplayWorker, checkDevice])

  // const onClick = useCallback(() => {
  //   checkDevice(true)
  // }, [checkDevice])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

  const isLoading = !isPlugged

  return (
    <div
      style={pathname === '/' ? { height: '100%', touchAction: 'none' } : { height: '1px' }}
      id={'main'}
      className="App"
      ref={mainElem}
    >
      {(deviceFound === false || isLoading) && pathname === '/' && (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {deviceFound === false && (
            <div>
              <Typography>Searching For Dongle</Typography>
              <RotatingLines
                strokeColor="grey"
                strokeWidth="5"
                animationDuration="0.75"
                width="96"
                visible={true}
              />
            </div>
          )}
          {deviceFound && (
            <div>
              <Typography>Searching For Phone</Typography>
              <RotatingLines
                strokeColor="grey"
                strokeWidth="5"
                animationDuration="0.75"
                width="96"
                visible={true}
              />
            </div>
          )}
        </div>
      )}
      <div
        id="videoContainer"
        onPointerDown={sendTouchEvent}
        onPointerMove={sendTouchEvent}
        onPointerUp={sendTouchEvent}
        onPointerCancel={sendTouchEvent}
        onPointerOut={sendTouchEvent}
        style={{
          height: '100%',
          width: '100%',
          padding: 0,
          margin: 0,
          display: 'flex',
          visibility: isPlugged ? 'visible' : 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          id={'video'}
          style={isPlugged ? { height: '100%' } : { height: '0%' }}
        />
      </div>
    </div>
  )
}

export default React.memo(Carplay)
