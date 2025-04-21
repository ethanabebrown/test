const express = require('express');
const axios = require('axios');
const qs = require('qs');

const app = express();
const port = process.env.PORT || 3001;
const cors = require('cors');
app.use(cors());

const CLIENT_ID = 'c89c120f-791b-4826-856c-c09659225db7'; 
const REDIRECT_URI = 'https://test-cuvl.onrender.com/callback';
let accessToken = null;

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
    return res.status(400).send('Authorization code missing');
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

    accessToken = response.data.access_token;
    console.log('Token saved');

    // Redirect back to frontend after login
    res.redirect('http://miviewer.com');
  } catch (e) {
    console.error('Token Exchange Error');
    res.status(500).send('Failed token exchange');
  }
});

app.get('/get-wado-url', async (req, res) => {

  if (!accessToken) {
    return res.status(401).json({error: 'Unauthorized'});
  }

  const binaryId = 'fi-.ZBIQGr6kBi4oQDsITp83vZlQxo1TryPXICsld70k4';
  const binaryUrl = `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/Binary/${binaryId}`;

  try {
    const response = await axios.get(binaryUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      }
    });

    const base64RTF = response.data.data;
    const decodedRTF = Buffer.from(base64RTF, 'base64').toString('utf8');
    const match = decodedRTF.match(/https:\/\/[^\s\\]+/);
    const wadoUrl = match ? match[0] : null;

    if (!wadoUrl) {
      return res.status(500).json({error: 'Failed to extract WADO URL'});
    }

    res.json({ wadoUrl });

  } catch (err) {
    res.status(500).json({error: 'Failed to fetch WADO URL'});
  }
});

app.get('/access-token', (req, res) => {
  if (!accessToken) {
    return res.status(401).json({error: 'Unauthorized'});
  }
  res.json({ accessToken });
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
