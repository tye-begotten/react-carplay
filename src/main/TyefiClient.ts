import { ExtraConfig } from "../../../main/Globals";
import { io, Socket } from 'socket.io-client'
import { EventEmitter } from 'events'



export enum TyefiMessageNames {
  Connection = 'connection',
  VolUp = 'volUp',
  VolDown = 'volDown',
  VolChange = 'volChange',
  Mute = 'mute',
  Play = 'play',
  Stop = 'stop',
}

export class TyefiClient extends EventEmitter {
  config: ExtraConfig
  io: Socket
  constructor(config?: ExtraConfig) {
    super()
    this.config = config

    try {
      this.io = io("http://0.0.0.0:6666", { autoConnect: true })

      // this.io = new Server({
      //   cors: {
      //     origin: '*'
      //   },
      // })

      this.io.on('connection', (socket) => {
        console.log(`carplay-tyefi connection received: ${socket.conn.remoteAddress}`)
        
        socket.on('volChange', (volume: number) => {
          console.log(`carplay-tyefi received ${TyefiMessageNames.VolChange} cmd, volume=${volume}`)
          this.emit(TyefiMessageNames.VolChange.toString(), volume)
        })

        // socket.on(TyefiMessageNames.Mute.toString(), (isMuted: boolean) => {
        //   console.log(`carplay-tyefi received ${TyefiMessageNames.Mute} cmd`)
        //   this.emit(TyefiMessageNames.Mute.toString(), isMuted)
        // })

        // socket.on(TyefiMessageNames.Play.toString(), () => {
        //   console.log(`carplay-tyefi received ${TyefiMessageNames.Play} cmd`)
        //   this.emit(TyefiMessageNames.Play.toString())
        // })

        // socket.on(TyefiMessageNames.Stop.toString(), () => {
        //   console.log(`carplay-tyefi received ${TyefiMessageNames.Stop} cmd`)
        //   this.emit(TyefiMessageNames.Stop.toString())
        // })

      })

      
      this.io.on('pong', () => {
        console.log(`TyefiClient received pong`)
      })

      if (!this.io.connected) {
        console.log("TyefiClient socket not connected, attempting to connect...")
        this.io.connect()
      }

      console.log("TyefiClient socket connected")

      console.log("sending ping")
      this.io.emit("ping")

      // console.log("carplay-tyefi beginning to listen on port 6666")

      // this.io.listen(6666)
      // console.log("carplay-tyefi listening on port 6666")
    } catch (ex) {
      console.log(`Tyefi.constructor: unhandled exception: ${ex}`)
      console.error(ex)
    }
  }

//   sendSettings() {
//     this.io.emit('settings', this.config)
//   }

//   sendReverse(reverse: boolean) {
//     this.io.emit('reverse', reverse)
//   }

//   sendLights(lights: boolean) {
//     this.io.emit('lights', lights)
//   }
}
