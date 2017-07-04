/**
 * Created by simon on 28/06/17.
 */

var mysql = require('mysql');
var classes = require('./classes');

var getDataFinished = false;

var machinesFabrication = [];
var machinesFabricationInitialized = false;

var machinesConditionnement = [];
var machinesConditionnementInitialized = false;

var gares = [];
var garesInitialized = false;

var commandes = [];
var commandesInitialized = false;

var commandesGares = [];
var commandesGaresInitialized = false;
var commandesGaresFilled = false;
var commandesGaresStatesChecked = false;

var con = mysql.createConnection({
  host: "localhost",
  user: "projet_bonbons",
  password: "projet_bonbons",
  database: "projet_bonbons"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("connected");
  generateRandomCommands();
  initMachinesFabrication();
  initMachinesConditionnement();
  initGares();
  var intervalGetCommands = setInterval(function() {
    getCommands();
    getCommandesGares();
  }, 10000);
  var intervalRun = setInterval(function() {
    if (machinesFabricationInitialized === true && commandesInitialized === true && machinesConditionnementInitialized === true) {
      var intervalRunFabrication = setInterval(function() {
        runFabrication();
      }, 1000);
      var intervalRunConditionnement = setInterval(function() {
        runConditionnement();
      }, 1000);

      clearInterval(intervalRun);
    }
  }, 100);
  var intervalRunGares = setInterval(function() {
    if (commandesGaresStatesChecked === true && garesInitialized === true) {
      var intervalRunGares2 = setInterval(function() {
        runGares();
      }, 1000);
      clearInterval(intervalRunGares);
    }
  }, 100)
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

var initMachinesConditionnement = function() {
  var sql = "SELECT * FROM conditionnement;";
  con.query(sql, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      var machine;
      if (!checkMachineExists(machinesConditionnement, result.machine)) {
        machine = new classes.MachineConditionnement(result.machine, result.contenant, result.cadence, result.delai_change_outils, 0, null);
        machinesConditionnement.push(machine);
      }
    });
    machinesConditionnementInitialized = true;
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
};

var initGares = function() {
  var sql = "SELECT * FROM gares;";
  con.query(sql, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      var bonbon;
      var gare;
      if (!checkGareExists(gares, result.id)) {
        bonbon = new classes.BonbonConditionnne(result.bonbon, result.couleur, result.variante, result.texture, result.contenant);
        gare = new classes.Gare(result.id, result.gare, bonbon, result.quantite);
        gares.push(gare);
      }
    });
    garesInitialized = true;
  });

  var checkGareExists = function (gares, gareId) {
    var check = false;
    gares.forEach(function(gare) {
      if (gare.id == gareId) {
        check = true;
      }
    });
    return check;
  };
};

var runFabrication = function() {
  machinesFabrication.forEach(function(machine) {
    if (machine.state === 0) {
      commandes.forEach(function(commande) {
        setTimeout(function() {
          if (machine.checkIsFree() && machine.checkHasVariante(commande.variante) && commande.etat === 0) {
            console.log("machine " + machine.id + " starts working on command " + commande.id);
            machine.launchProduction(commande, con);
          }
        }, random(0, 1000));
      });
    }
  });
};

var runConditionnement = function() {
  machinesConditionnement.forEach(function(machine) {
    if (machine.state === 0) {
      commandes.forEach(function(commande) {
        setTimeout(function(){
          if (machine.checkIsFree() && machine.contenant === commande.contenant && commande.etat === 2) {
            console.log("machine " + machine.id + "start conditioning command " + commande.id);
            machine.launchConditionnement(commande, con);
          }
        }, random(0, 1000));
      });
    }
  });
};

var runGares = function() {
  commandesGares.forEach(function(commandeGare) {
    if (commandeGare.etat === 1) {
      commandeGare.launchFill(gares, con);
    }
  });
};

var getCommands = function() {
  commandesInitialized = false;
  var sql = "SELECT * FROM commandes;";
  con.query(sql, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      var commande;
      if (!checkCommandeExists(commandes, result.id)) {
        commande = new classes.Commande(result.bonbon, result.couleur, result.variante, result.texture, result.contenant, result.quantite, result.id, result.etat);
        commandes.push(commande);
      }
    });
    commandesInitialized = true;
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

var getCommandesGares = function() {
  commandesInitialized = false;
  var sqlGetCommandesId = "SELECT * FROM commandes_id;";
  con.query(sqlGetCommandesId, function(err, results) {
    if (err) throw err;
    results.forEach(function(result) {
      if (!checkCommandeExists(commandesGares, result.id)) {
        var commandeId = new classes.CommandeGares(result.id, result.pays, result.etat, []);
        commandesGares.push(commandeId);
      }
    });
    commandesGaresInitialized = true;
    fillCommandesGares();
  });

  var checkCommandeExists = function (commandes, commandeId) {
    var check = false;
    commandes.forEach(function(commande) {
      if (commande.id === commandeId) {
        check = true;
      }
    });
    return check;
  };
};

var fillCommandesGares = function() {
  var interval = setInterval(function() {
    if (commandesGaresInitialized) {
      clearInterval(interval);
      commandesGares.forEach(function(commandeGare) {
        var sql = "SELECT * FROM commandes WHERE commande_id = " + commandeGare.id + ";";
        con.query(sql, function(err, results) {
          if(err) throw err;
          results.forEach(function(result) {
            if (!checkCommandeExists(commandeGare.commandes, result.id)) {
              var commande = new classes.Commande(result.bonbon, result.couleur, result.variante, result.texture, result.contenant, result.quantite, result.id, result.etat);
              commandeGare.commandes.push(commande);
            } else {
              updateCommandeState(commandeGare.commandes, result.id, result.etat);
            }
          })
        })
      });
      commandesGaresFilled = true;
      checkComandesGaresStates();
    }
  }, 1000);

  var checkCommandeExists = function(commandes, commandeId) {
    var check = false;
    commandes.forEach(function(commande) {
      if (commande.id === commandeId) {
        check = true;
      }
    });
    return check;
  };

  var updateCommandeState = function(commandes, commandeId, newState) {
    commandes.forEach(function(commande) {
      if (commande.id === commandeId) {
        commande.etat = newState;
      }
    });
  }
};

var checkComandesGaresStates = function() {
  commandesGares.forEach(function(commandeGare) {
    var count = 0;
    var count2 = 0;
    var count3 = commandeGare.commandes.length;
    var checkCount2 = false;
    for (var i = 0; i < commandeGare.commandes.length; i++) {
      if (commandeGare.commandes[i].etat === 4 || commandeGare.commandes[i].etat === 5) {
        count++;
      }
      count2++;
      if (count2 === count3)
        checkCount2 = true;
    }
    var interval = setInterval(function() {
      if (checkCount2) {
        clearInterval(interval);
        if (count === commandeGare.commandes.length) {
          commandeGare.changeState(1, con);
        }
      }
    }, 100);
  });
  commandesGaresStatesChecked = true;
};

var generateRandomCommands = function () {
  var interval = setInterval(function() {
    var data = [];
    getDataFinished = false;
    getServerData(data);

    var interval2 = setInterval(function() {
      if (getDataFinished) {
        var sqlCommandeId = "INSERT INTO commandes_id(pays) VALUES(" + data["pays"][random(0, data.pays.length-1)].id + ");";
        con.query(sqlCommandeId, function(err, results) {
          if (err) throw err;
          for (var i = 0; i < random(1, 3); i++) {
            var commande = new classes.Commande(
              data["bonbons"][random(0, data.bonbons.length-1)].id,
              data["couleurs"][random(0, data.couleurs.length-1)].id,
              data["variantes"][random(0, data.variantes.length-1)].id,
              data["textures"][random(0, data.textures.length-1)].id,
              data["contenants"][random(0, data.contenants.length-1)].id,
              random(1, 50)
            );
            sendNewCommande(commande, results.insertId);
          }
        });
        clearInterval(interval2);
      }
    }, 100);
  }, random(300000, 1800000) /*5000*/); //random entre 5 et 30 minutes (1800000 = 30min & 300000 = 5min)
};

var getServerData = function(data) {
  var count = 0;
  var selectBonbons = "SELECT * FROM bonbons;";
  var selectCouleurs = "SELECT * FROM couleurs;";
  var selectVariantes = "SELECT * FROM variantes;";
  var selectTextures = "SELECT * FROM textures;";
  var selectContenants = "SELECT * FROM contenants;";
  var selectPays = "SELECT * FROM pays;";
  con.query(selectBonbons, function(err, results) {
    if (err) throw err;
    // console.log("Result: " + result[0]["bonbon"]);
    // data["bonbons"] = results;
    data["bonbons"] = [];
    results.forEach(function(result) {
      for (var i = 0; i < result.coef; i++) {
        data["bonbons"].push(result);
      }
    });
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
  con.query(selectPays, function(err, results) {
    if (err) throw err;
    // console.log("Result: " + result[0]["pays"]);
    // data["pays"] = result;
    data["pays"] = [];
    results.forEach(function(result) {
      for (var i = 0; i < result.coef; i++) {
        data["pays"].push(result);
      }
    });
    count+=1;
  });

  var interval1 = setInterval(function() {
    if (count = 6) {
      getDataFinished = true;
      clearInterval(interval1);
    }
  }, 100);
};

var sendNewCommande = function(commande, commandeId) {
  var sql = "INSERT INTO commandes(commande_id, bonbon, couleur, variante, texture, contenant, quantite)" +
    "VALUES ("+ commandeId + ", " +commande.bonbon+", "+commande.couleur+", "+commande.variante+", "+commande.texture+", "+commande.contenant+", "+commande.quantite+");";
  con.query(sql, function(err, result) {
    if (err) throw err;
  });
};

var random = function(min, max) {
  return Math.floor(Math.random() * ((max - min) + 1 ) + min);
};
