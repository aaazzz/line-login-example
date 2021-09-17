const express = require('express')
const axios = require('axios')
const querystring = require('querystring')
const dotenv = require('dotenv')
const app = express()
const port = 5000

dotenv.config()
const channel_id = process.env.CHANNEL_ID
const client_secret = process.env.CLIENT_SECRET
const state = process.env.STATE
const redirect_uri = 'http://localhost:5000'
const scope = 'profile%20openid'
const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channel_id}&redirect_uri=${redirect_uri}&state=${state}&scope=${scope}`

app.get('/', async (req, res) => {
  const {code, state} = req.query

  try {
    const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', 
      querystring.stringify({
        'grant_type': 'authorization_code',
        'code': code, 
        'redirect_uri': redirect_uri,
        'client_id': channel_id,
        'client_secret': client_secret
      })

    )
    const {id_token} = tokenResponse.data

    const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify', querystring.stringify({
      'id_token': id_token,
      'client_id': channel_id
    }))

    res.format({
      html: () => {
        res.send(`<pre>${JSON.stringify({code,state,...tokenResponse.data,...verifyResponse.data},null,4)}</pre><img src=${verifyResponse.data.picture} width="200">`)
      }
    })
  } catch (e) {
    console.log(e)
    res.send('error happened')
  }
})

app.listen(port, () => {
  console.log('LINE login URL: ' + url)
})
