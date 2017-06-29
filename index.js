/**
 * Created by simon on 28/06/17.
 */

var mysql = require('mysql');
var classes = require('./classes');

var getDataFinished = false;

var machinesFabrication = [];
var machinesFabricationInitialized = false;

var commandesAFabriquer = [];
var commandesAFabriquerInitialized = false;

var con = mysql.createConnection({
  host: "localhost",
  user: "projet_bonbons",
  password: "projet_bonbons",
  database: "projet_bonbons"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("connected");
  generageRandomCommands();
  initMachinesFabrication();
  getCommands();
  var intervalRunFabrib = setInterval(function() {
    if (machinesFabricationInitialized === true && commandesAFabriquerInitialized === true) {
      var intervalRunFabrication = setInterval(function() {
        runFabrication();
      }, 1000);
      clearInterval(intervalRunFabrib);
    }
  }, 100);
});

var initMachinesFabrication = function() {
  var sql = "SELECT * FROM fabrication;";
  con.query(sql, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      var machine;
      if (!checkMachineExists(machinesFabrication, result.machine)) {
        machine = new classes.MachineFabric(result.machine, [], [], [], 0, null);
        machinesFabrication.push(machine);
      } else {
        machine = getMachineById(machinesFabrication, result.machine);
      }
      machine.variantes.push(result.variante);
      machine.cadences.push(result.cadence);
      machine.delaiChangeOutils.push(result.delai_change_outils);
    });
    machinesFabricationInitialized = true;
  });

  var checkMachineExists = function (machines, machineId) {
    var check = false;
    machines.forEach(function(machine) {
      if (machine.id == machineId) {
        check = true;
      }
    });
    return check;
  };

  var getMachineById = function (machines, machineId) {
    var returnMachine;
    machines.forEach(function(machine) {
      if (machine.id == machineId) {
        returnMachine = machine;
      }
    });
    return returnMachine;
  }
};

var runFabrication = function() {
  machinesFabrication.forEach(function(machine) {
    if (machine.state === 0) {
      commandesAFabriquer.forEach(function(commande) {
        if (machine.checkIsFree() && machine.checkHasVariante(commande.variante) && commande.etat === 0) {
          console.log("machine " + machine.id + " starts working on command " + commande.id);
          machine.launchProduction(commande, con);
        }
      })
    }
  })
};

var getCommands = function() {
  commandesAFabriquerInitialized = false;
  var sql = "SELECT * FROM commandes WHERE etat = 0;";
  con.query(sql, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      var commande;
      if (!checkCommandeExists(commandesAFabriquer, result.id)) {
        commande = new classes.Commande(result.bonbon, result.couleur, result.variante, result.texture, result.contenant, result.quantite, result.pays, result.id, result.etat)
        commandesAFabriquer.push(commande);
      }
    });
    commandesAFabriquerInitialized = true;
  });

  var checkCommandeExists = function (commandes, commandeId) {
    var check = false;
    commandes.forEach(function(commande) {
      if (commande.id == commandeId) {
        check = true;
      }
    });
    return check;
  };
};

var generageRandomCommands = function () {
  var interval = setInterval(function() {
    var data = [];
    getDataFinished = false;
    getServerData(data);

    var interval2 = setInterval(function() {
      if (getDataFinished) {
        var commande = new classes.Commande(
          data["bonbons"][random(0, data.bonbons.length-1)].id,
          data["couleurs"][random(0, data.couleurs.length-1)].id,
          data["variantes"][random(0, data.variantes.length-1)].id,
          data["textures"][random(0, data.textures.length-1)].id,
          data["contenants"][random(0, data.contenants.length-1)].id,
          random(1, 50),
          data["pays"][random(0, data.pays.length-1)].id
        );
        sendNewCommande(commande);
        clearInterval(interval2);
      }
    }, 100);
  }, random(300000, 1800000)); //random entre 5 et 30 minutes (1800000 = 30min & 300000 = 5min)
};

var getServerData = function(data) {
  var count = 0;
  var selectBonbons = "SELECT * FROM bonbons;";
  var selectCouleurs = "SELECT * FROM couleurs;";
  var selectVariantes = "SELECT * FROM variantes;";
  var selectTextures = "SELECT * FROM textures;";
  var selectContenants = "SELECT * FROM contenants;";
  var selectPays = "SELECT * FROM pays;";
  con.query(selectBonbons, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["bonbon"]);
    data["bonbons"] = result;
    count+=1;
  });
  con.query(selectCouleurs, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["couleur"]);
    data["couleurs"] = result;
    count+=1;
  });
  con.query(selectVariantes, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["variante"]);
    data["variantes"] = result;
    count+=1;
  });
  con.query(selectTextures, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["texture"]);
    data["textures"] = result;
    count+=1;
  });
  con.query(selectContenants, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["contenant"]);
    data["contenants"] = result;
    count+=1;
  });
  con.query(selectPays, function(err, result) {
    if (err) throw err;
    // console.log("Result: " + result[0]["pays"]);
    data["pays"] = result;
    count+=1;
  });

  var interval1 = setInterval(function() {
    if (count = 6) {
      getDataFinished = true;
      clearInterval(interval1);
    }
  }, 100);
};

var sendNewCommande = function(commande) {
  var sql = "INSERT INTO commandes(bonbon, couleur, variante, texture, contenant, quantite, pays)" +
    "VALUES ("+commande.bonbon+", "+commande.couleur+", "+commande.variante+", "+commande.texture+", "+commande.contenant+", "+commande.quantite+", "+commande.pays+");"
  con.query(sql, function(err, result) {
    if (err) throw err;
  });
};

var random = function(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1 ) + min);
};
