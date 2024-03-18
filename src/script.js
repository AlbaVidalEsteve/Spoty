const clientId = "12b724b608d547bea90957d24260b12c"; // Replace with your client ID
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  redirectToAuthCodeFlow(clientId);
} else {
  const accessToken = await getAccessToken(clientId, code);
  // console.log(accessToken)
  const profile = await fetchProfile(accessToken);
  populateUI(profile);
  //Access playlists
  const playlists = await fetchPlaylist(accessToken, profile);
  // console.log(playlists);
  // const arrayIDs = populatePlaylistUI(playlists);
  const trackIDsArray = selectPlaylist(accessToken);
  // await fetchTrackData(accessToken, trackIDsArray);
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

//Buscar playlists de l'usuari
async function fetchPlaylist(token, profile) {
  let userID = profile.id;
  fetch(`https://api.spotify.com/v1/users/${userID}/playlists`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((result) => result.json())
    .then((datos) => {
      // console.log(datos.items)
      // return  datos.items;
      populatePlaylistUI(datos.items);
    });
}

async function populatePlaylistUI(playlists) {
  let container = document.querySelector("#playlist-container");
  // let playlistArray = playlists.items;
  // let arrayIDs = [];
  // console.log(playlists);
  playlists.map((playlist) => {
    //Donem valor a les variables de la playlist
    let playlistID = playlist.id;
    // arrayIDs.push(playlistID);
    let playlistURI = playlist.uri.slice(17);
    let playlistName = playlist.name;
    let playlistImages = playlist.images[0].url;
    //Variables al DOM
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
    //Listener a cada playlist per seleccionar-les
    playlistDiv.addEventListener("click", () => {
      playlistDiv.classList.toggle("active");
    });
  });
  // let playlistsSeleccionadas = document.querySelectorAll(".active");
  // let idPlaylistSeleccionadas = [];
  // playlistsSeleccionadas.forEach((playlist) => {
  //   idPlaylistSeleccionadas.push(playlist.id);
  // });
  // console.log(idPlaylistSeleccionadas);
  // console.log(arrayIDs)
  // return await arrayIDs;
}

//Boton Next
function selectPlaylist(token){
  let boton = document.querySelector('.next-btn');
  let idPlaylistSeleccionadas = [];
  const trackIDsArray = [];
  // console.log(boton)
  boton.addEventListener('click', () =>{
    let playlistsSeleccionadas = document.querySelectorAll(".active");
    // console.log(playlistsSeleccionadas)
    playlistsSeleccionadas.forEach(playlist => {
      idPlaylistSeleccionadas.push(playlist.id);
    })
    // console.log(idPlaylistSeleccionadas)
    
    idPlaylistSeleccionadas.map((playlistID) => {
      fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => response.json())
        .then((datos) => {
          let items = datos.items;
          // console.log(items)
          items.map((item) => {
            let trackID = item.track.id; //aconseguir ids dels tracks
            console.log(trackID);
            trackIDsArray.push(trackID);
          });
          
        });
        fetchTrackData(token, trackIDsArray)
    });
    console.log(trackIDsArray)
    
    // return trackIDsArray;
    });
};

//Access track data (genre, tempo, danceblility...)
function fetchTrackData(token, trackIDsArray) {
  console.log(trackIDsArray)
  const trackIDs = trackIDsArray.join(',')
  console.log(trackIDs)
  trackIDsArray.map(async(trackID) => {
    await fetch(`https://api.spotify.com/v1/tracks?ids=${trackID}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((datos) => console.log(datos))
  });

};
