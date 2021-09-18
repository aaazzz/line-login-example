const express = require('express')
const axios = require('axios')
const querystring = require('querystring')
const dotenv = require('dotenv')
const dateformat = require('dateformat')
const db = require('./db-config');
const app = express()
const port = 5000

dotenv.config()
const channel_id = process.env.CHANNEL_ID
const client_secret = process.env.CLIENT_SECRET
const state = process.env.STATE
const redirect_uri = 'http://localhost:5000/callback'
const scope = 'profile%20openid'
const url = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channel_id}&redirect_uri=${redirect_uri}&state=${state}&scope=${scope}`

app.get('/login', (req, res) => {
  // some logic before login here
  
  // redirect to LINE login
  res.redirect(url)
})

app.get('/callback', async (req, res) => {
  // some logic after login here
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
    const {access_token, id_token} = tokenResponse.data

    const verifyResponse = await axios.post('https://api.line.me/oauth2/v2.1/verify', querystring.stringify({
      'id_token': id_token,
      'client_id': channel_id
    }))

    const profileResponse = await axios.get('https://api.line.me/v2/profile', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    const html = `
<pre>
${JSON.stringify({code,state,...tokenResponse.data,...verifyResponse.data,...profileResponse.data},null,4)}
</pre>
<img src=${verifyResponse.data.picture} width="200">
`.trim()

    const payload = {
      user_id: profileResponse.data.userId, 
      name: profileResponse.data.displayName,
      status_message: profileResponse.data.statusMessage,
      picture: profileResponse.data.pictureUrl,
      access_token: tokenResponse.data.access_token,
      refresh_token: tokenResponse.data.refresh_token,
      id_token: tokenResponse.data.id_token,
    }

    // upsert user information to DB
    await db('users').insert({
      ...payload,
      created_at: dateformat(new Date(), 'isoUtcDateTime')
    }).onConflict('user_id').merge({
      ...payload,
      updated_at: dateformat(new Date(), 'isoUtcDateTime')
    })

    res.format({
      html: () => {
        res.send(html)
      }
    })
  } catch (e) {
    console.log(e)
    res.send('error happened')
  }
})

app.listen(port, () => {
  console.log('http://localhost:5000/login')
})

