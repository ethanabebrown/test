const express = require('express');
const axios = require('axios');
const qs = require('qs');

const app = express();
const port = process.env.PORT || 3001;
const cors = require('cors');
app.use(cors());

const CLIENT_ID = 'c89c120f-791b-4826-856c-c09659225db7'; // ← replace this
const REDIRECT_URI = 'https://miviewer.com/callback';

app.get('/launch', (req, res) => {
  const state = Math.random().toString(36).substring(2);

  const scope = [
    'openid',
    'profile',
    'launch',
    'offline_access',
    'patient/Patient.read',
    'patient/Patient.write',
    'patient/DocumentReference.read',
    'patient/DocumentReference.write',
    'patient/ImagingStudy.read',
    'patient/ImagingStudy.write',
    'patient/DiagnosticReport.read',
    'patient/DiagnosticReport.write',
  ].join('%20');
  
  const authUrl = `https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${scope}&aud=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4&state=${state}`;

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }

  const tokenUrl = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';

  try {
    const response = await axios.post(
      tokenUrl,
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('Token Response:', response.data);
    res.json(response.data);
  } catch (e) {
    console.error('Token Exchange Error:', e.response?.data || e.message);
    res
      .status(500)
      .send('Token exchange failed: ' + JSON.stringify(e.response?.data || e.message));
  }
});


app.listen(port, () => console.log(`Listening at http://localhost:${port}`));