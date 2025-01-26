import express from 'express';
import session from 'express-session';
import requestIp from 'request-ip'
import moment from 'moment-timezone';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const app = express();

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret: 'Practica04 JBB#Jenny-Sessiones',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 5*60*1000}
}))

const sessions = {};
app.use(requestIp.mw());


const getServerIp = () =>{
    const interfaces = os.networkInterfaces();
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                return iface.address;
            }
        }
    }
}
const getServerMac = () =>{
    const interfaces = os.networkInterfaces();
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                return iface.mac;
            }
        }
    }
}

setInterval(() => {
    const now = Date.now();
    for (const sessionId in sessions) {
        const { lastAccess } = sessions[sessionId];
        const sessionAge = now - new Date(lastAccess);
        if (sessionAge > 5 * 60 * 1000) { // 5 minutos
            delete sessions[sessionId];
        }
    }
}, 60 * 1000); 


app.get('/',(req,res)=>{
    return res.status(200).json({
        message:"Bienvenido al API de Control de Sesiones",
        author: "Jennifer Bautista Barrios"
    })
})

app.post('/login', (req,res)=> {
    const { name , email } = req.body;

    if(!email || !name){
        return res.status(400).json({error: "Datos no recibidos correctamente"})
    }

    const sessionId = uuidv4();

    sessions[sessionId] = {
        sessionId,
        name,
        email, 
        start : moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        lastAccess : moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        lastActivity : moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
        serverIp : getServerIp(),
        serverMac : getServerMac(),
        clientIp : req.socket.remoteAddress
    }  

    res.status(200).json({
        message:"Se ha logeado de manera exitosa",
        sessionId,
    })
})

app.get('/update', (req,res) => {
    const {sessionId, name, email} = req.body
    if(!sessionId || !name || !email){

        return res.status(400).json({error: "Datos no recibidos correctamente"})
    }

    if(email) sessions[sessionId].name = name;
    if(email) sessions[sessionId].email = email;
    const {lastAccess, lastActivity} = moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
    sessions[sessionId].lastAccess = lastAccess;
    sessions[sessionId].lastActivity = lastActivity;

    res.status(200).json({message:"Sus datos se han actualizado de manera exitosa"})
})

app.get('/status', (req, res) => {
    const sessionId = req.query.sessionId;

    if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({ message: "No existe una sesión activa" });
    }

    const start  = sessions[sessionId];
    const inicio = new Date(start);
    const ahora  = new Date();

    const antiguedadMS = ahora - inicio;
    const horas = Math.floor(antiguedadMS / (1000 * 60 * 60));
    const minutos = Math.floor((antiguedadMS % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((antiguedadMS % (1000 * 60)) / 1000);


    const lastActivity = moment(new Date()).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
    sessions[sessionId].lastActivity = lastActivity;

    res.status(200).json({
        message: "Sesión Activa",
        sessionTime: `${horas} horas, ${minutos} minutos, ${segundos} segundos`,
        session: sessions[sessionId],
    });
});

app.get('/listCurrentSessions', (req, res)=>{
    const password = req.query.password;

    if(password != 'Jennifer'){
        return res.status(401).json({error: 'La contraseña es incorrecta'})
    }

    if(Object.keys(sessions).length === 0){
        return res.status(200).json({message: "Actualmente no hay sesiones activas"})
    }
    const formatedSessions = Object.values(sessions).map(({ sessionId, name, email, start, lastAccess, lastActivity, serverIp, clientIp, serverMac }) => {

        const ahora = new Date();
        const ultimaActividad = new Date(lastActivity);
        const diferenciaMS = ahora - ultimaActividad;    
        const minutos = Math.floor((diferenciaMS % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenciaMS  % (1000 * 60)) / 1000);

        return {
            sessionId,
            name,
            email,
            start,
            lastAccess,
            lastActivity,
            inactivityTime : `${minutos}minutos ${segundos}segundos`,
            serverIp,
            serverMac,
            clientIp
        };
    });

    res.status(200).json({
        message: "Bienvenido a su panel de administración de sesiones",
        sessions: formatedSessions})

});

app.post('/logout', (req,res)=>{
    const sessionId = req.query.sessionId;
    if(!sessionId || sessions[sessionId]){
        return res.status(404).json({message:"No se ha encontrado una sesión activa."})
    }

    delete sessions[sessionId];
    req.session.destroy((error)=>{
        if(error){
            return res.status(500).json({error: 'Error al cerrar la sesión'})
        }
    })

    res.status(200).json({message: "Logout exitoso"})
})



const PORT = 3001;
app.listen(PORT, ()=> {
    console.log(`Servidor escuchando en http://localhost:${PORT}`)
})