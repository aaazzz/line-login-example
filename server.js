const express = require('express')
const cors = require('cors')
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
const userPage = process.env.USER_PAGE

app.use(express.json())
app.use(cors())

app.get('/login', (req, res) => {
  // some logic before login here
  
  // redirect to LINE login
  res.redirect(url)
})

app.get('/user/:otp', async (req, res, next) => {
  if (req.params.otp === '1234') {
    res.json({message: 'otp not matched'})
  }

  const records = await db.select().table('users').where('otp', '=', req.params.otp)

  if (records.length === 0) {
    return 
  }

  const payload = {
    user_id: records[0].user_id,
    name: records[0].name,
    status_message: records[0].status_message,
  }

  res.json(payload)
})

app.post('/register/:user_id', async (req, res) => {
  console.log(req.body)
  const result = await db('users')
    .where('user_id', '=', req.params.user_id)
  .update({
    name: req.body.name,
    other: req.body.other,
    updated_at: dateformat(new Date(), 'isoUtcDateTime')
  })
  res.json({
    updated: result
  })
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

    console.log(`${userPage}?id=${profileResponse.data.userId}&name=${profileResponse.data.displayName}`)

    // use one time token instead of real values...?
    const otp = '1234'
    await db('users')
      .where('user_id', '=', profileResponse.data.userId)
      .update({
        otp: otp,
        updated_at: dateformat(new Date(), 'isoUtcDateTime')
      })
    res.redirect(`${userPage}?t=${otp}`)
    // res.redirect(`${userPage}?id=${profileResponse.data.userId}&name=${profileResponse.data.displayName}`)

  } catch (e) {
    res.send('error happened')
  }
})

app.listen(port, () => {
  console.log('http://localhost:5000/login')
})

