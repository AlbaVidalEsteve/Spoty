const clientId = "12b724b608d547bea90957d24260b12c"; // Reemplaza con tu ID de cliente
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  // console.log(accessToken)
  const profile = await fetchProfile(accessToken);
  populateUI(profile);
  // Acceder a las playlists
  const playlists = await fetchPlaylist(accessToken, profile);
  // console.log(playlists);
  // const arrayIDs = populatePlaylistUI(playlists);
  const trackIDsArray = await selectPlaylist(accessToken);
  await fetchTrackData(accessToken, trackIDsArray);
}

export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const { access_token } = await result.json();
  return access_token;
}

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  // console.log(result)
  return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  // console.log(profile)
  if (profile.images[0]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[0].url;
    document.getElementById("avatar").appendChild(profileImage);
    document.getElementById("imgUrl").innerText = profile.images[0].url;
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}

// Buscar playlists del usuario
async function fetchPlaylist(token, profile) {
  let userID = profile.id;
  const result = await fetch(
    `https://api.spotify.com/v1/users/${userID}/playlists`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await result.json();
  // console.log(data.items);
  populatePlaylistUI(data.items);
  return data.items.map((playlist) => playlist.id);
}

async function populatePlaylistUI(playlists) {
  let container = document.querySelector("#playlist-container");
  playlists.forEach((playlist) => {
    let playlistID = playlist.id;
    let playlistURI = playlist.uri.slice(17);
    let playlistName = playlist.name;
    let playlistImages = playlist.images[0].url;

    let playlistDiv = document.createElement("div");
    playlistDiv.setAttribute("class", "playlistDiv");
    playlistDiv.setAttribute("id", playlistID);
    container.append(playlistDiv);

    let spanName = document.createElement("p");
    spanName.innerText = playlistName;
    let figure = document.createElement("figure");
    let image = document.createElement("img");
    image.setAttribute("src", playlistImages);
    figure.append(image);
    playlistDiv.append(figure, spanName);

    playlistDiv.addEventListener("click", () => {
      playlistDiv.classList.toggle("active");
    });
  });
}

// Botón Next
async function selectPlaylist(token) {
  return new Promise((resolve, reject) => {
    let boton = document.querySelector(".next-btn");
    let idPlaylistSeleccionadas = [];

    boton.addEventListener("click", async () => {
      let playlistsSeleccionadas = document.querySelectorAll(".active");

      playlistsSeleccionadas.forEach((playlist) => {
        idPlaylistSeleccionadas.push(playlist.id);
      });

      let trackIDsArray = [];
      for (const playlistID of idPlaylistSeleccionadas) {
        const tracks = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await tracks.json();
        const items = data.items;
        items.forEach((item) => {
          let trackID = item.track.id;
          trackIDsArray.push(trackID);
        });
      }
      //   console.log(trackIDsArray);
      resolve(trackIDsArray);
    });
  });
}

// Acceder a los datos de las pistas (género, tempo, danceability...)
async function fetchTrackData(token, trackIDsArray) {
  // console.log(trackIDsArray)
  //   const trackIDs = trackIDsArray.join(',');
  //   console.log(trackIDs)
  //     const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIDs}`, {
  //       method: "GET",
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     const data = await response.json();
  //     const tracks = data.tracks
  //     console.log(data);
  trackIDsArray.map(async (trackID) => {
    let urlGenere = `https://api.spotify.com/v1/tracks/${trackID}`
    let urlFeatures = `https://api.spotify.com/v1/audio-analysis/${trackID}`
    await fetch(urlGenere, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((datos) => {
        // console.log(datos);
        showTrackData(datos);
      });
  });
}

function showTrackData(datos) {
    console.log(datos)
}
