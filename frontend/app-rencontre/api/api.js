
import axios from "axios";

const API = axios.create({
  baseURL: "https://application-de-rencontre-production.up.railway.app/",
  timeout: 10000
});

export default API;
