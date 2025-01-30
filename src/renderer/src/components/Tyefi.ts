import { ExtraConfig } from "../../../main/Globals";
import { Server } from 'socket.io'
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

export class Tyefi extends EventEmitter {
  config: ExtraConfig
  io: Server
  constructor(config: ExtraConfig) {
    super()
    this.config = config
    this.io = new Server({
      cors: {
        origin: '*'
      }
    })

    this.io.on(TyefiMessageNames.Connection, (socket) => {
      console.log(`carplay-tyefi connection received: ${socket.conn.remoteAddress}`)
      
      socket.on(TyefiMessageNames.VolChange, (volume: number) => {
        console.log(`carplay-tyefi received ${TyefiMessageNames.VolChange} cmd, volume=${volume}`)
        this.emit(TyefiMessageNames.VolChange, volume)
      })

      socket.on(TyefiMessageNames.Mute, (isMuted: boolean) => {
        console.log(`carplay-tyefi received ${TyefiMessageNames.Mute} cmd`)
        this.emit(TyefiMessageNames.Mute, isMuted)
      })

      socket.on(TyefiMessageNames.Play, () => {
        console.log(`carplay-tyefi received ${TyefiMessageNames.Play} cmd`)
        this.emit(TyefiMessageNames.Play)
      })

      socket.on(TyefiMessageNames.Stop, () => {
        console.log(`carplay-tyefi received ${TyefiMessageNames.Stop} cmd`)
        this.emit(TyefiMessageNames.Stop)
      })
    })

    this.io.listen(6666)
    console.log("carplay-tyefi listening on port 6666")
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
