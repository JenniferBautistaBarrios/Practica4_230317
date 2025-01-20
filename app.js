import express from 'express';
import session from 'express-session';
import requestIp from 'request-ip'
import macaddress from 'macaddress'
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'path';

const app = express();

app.use(requestIp.mw());

app.use(session({
    secret: 'Practica04 JBB#Jenny-Sessiones',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 5*60*1000}
}))

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
const getClientMac = () => {
    return new Promise((resolve, reject) => {
        macaddress.one((err, mac) => {
            if (err) {
                reject('Error al obtener la dirección MAC:', err);
            }
                resolve(mac);
        });
    })
   
}

app.get('/login/:nombre/:email', async(req,res)=> {
    if(!req.session.start){
        req.session.start = new Date();
        req.session.lastAccess = new Date();
        req.session.uuid = uuidv4();
        req.session.serverIp = getServerIp();
        req.session.serverMac = getServerMac();
        req.session.clientIp = req.socket.remoteAddress;
        req.session.clientMac = await getClientMac();
        req.session.name = req.params.nombre;
        req.session.email = req.params.email;

        res.send('Nueva sesion iniciada');
    }else{
        res.send('La sesión ya esta activa');
    }
})

app.get('/update', (req,res) => {
    if(!req.session.start){
        req.session.lastAccess = new Date();
        res.send('Datos de sesión actualizados.')
    }else{
        res.send('No hay una sesión activa.')
    }
})

app.get('/listCurrentSessions', (req,res) => {
    if (req.session.start){
        const inicio = new Date(req.session.start);
        const ultimoAccesso = new Date(req.session.lastAccess);
        const ahora = new Date();

        // Calcular tiempo de la session
        const antiguedadMS = ahora-inicio
        const horas = Math.floor(antiguedadMS / (1000*60*60))
        const minutos = Math.floor((antiguedadMS % (1000*60*60)) / (1000*60))
        const segundos = Math.floor((antiguedadMS % (1000*60)) /1000)
        
        if(minutos >= 2){
            req.session.destroy((error) => {
                if(error){
                    return res.status(500).send('Error al cerrar la sesión')
                }
                res.send('Sesión cerrada por tiempo de inactividad.')
            })
        }
    
    

        res.json ({
            mensaje:'Estado de la sesión ',
            nombreUsuario: req.session.name,
            correo: req.session.email,
            uuid: req.session.uuid,
            ipServidor: req.session.serverIp,
            macServidor: req.session.serverMac,
            ipCliente: req.session.clientIp,
            macCliente: req.session.clientMac,
            inicio: inicio.toISOString(),
            ultimoAcceso: ultimoAccesso.toISOString(),
            sessionTime: `${horas} horas, ${minutos} minutos, ${segundos} segundos`

        })
    
    }else{
        res.send('No hay una sesión activa')
    }
})

app.get('/logout', (req,res)=>{
    if(!req.session){
        req.session.destroy((error) => {
            if(error){
                return res.status(500).send('Error al cerrar la sesión')
            }
            res.send('Sesión cerrada correctamente.')
        })
    }else{
        res.send('No hay una sesión activa para cerrar.')
    }
})

const PORT = 3000;
app.listen(PORT, ()=> {
    console.log(`Servidor escuchando en http://localhost:${PORT}`)
})