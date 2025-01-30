import { Button } from "@mui/base"
import { Grid, TextField } from "@mui/material"
import { stderr, stdout } from "process"


const MAX_LOG_LENGTH = 1000
const __log = []

function Info() {
  stdout.on('data', (data) => {
    data.split('\n').forEach((line) => {
      __log.push(line)
    })
    while (__log.length > MAX_LOG_LENGTH) {
      __log.shift()
    }
  })
  
  stderr.on('data', (data) => {
    __log.push(`ERROR: ${data}`)
    let i = 0
    data.split('\n').forEach((line) => {
      if ( i === 0 ) {
        __log.push(`ERROR: ${line}`)
      } else {
        __log.push(line)
      }
      i++
    })
    while (__log.length > MAX_LOG_LENGTH) {
      __log.shift()
    }
  });

  function clearLog() {
    while (__log.length > 0) {
      __log.pop()
    }
  }

  return (
    <Grid container spacing={2}>
      <div>console output</div>
      <Grid xs={12}>
        <TextField multiline={true} rows={30} value={__log.join('\n')} />
        <Button onClick={() => clearLog()}>CLEAR</Button>
      </Grid>
    </Grid>
  )
}

export default Info
