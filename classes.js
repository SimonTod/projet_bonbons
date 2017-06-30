/**
 * Created by simon on 29/06/17.
 */

module.exports = {
  Commande: class {
    /*
     commande state :
     - 0 : en attente de fabrication
     - 1 : en cours de fabrication
     - 2 : en attente de conditionnement
     - 3 : en cours de conditionnement
     - 4 : pret à l'envoi
     */
    constructor(bonbon, couleur, variante, texture, contenant, quantite, id, etat) {
      this.id = id;
      this.bonbon = bonbon;
      this.couleur = couleur;
      this.variante = variante;
      this.texture = texture;
      this.contenant = contenant;
      this.quantite = quantite;
      this.etat = etat;
    }

    changeState(newState, con) {
      this.etat = newState;
      var sql = "UPDATE commandes SET etat = "+this.etat+" WHERE id = " + this.id + ";";
      con.query(sql, function(err, results) {
        if (err) throw err;
      });
    }
  },

  MachineFabric: class {
    /*
    machine state :
    - 0 : à l'arret
    - 1 : en marche
    - 2 : changement d'outil
    - 3 : outil changé / machine prete
     */
    constructor(id, variantes, cadences, delaiChangeOutils, state, bonbon) {
      this.id = id;
      this.variantes = variantes; // []
      this.cadences = cadences; // []
      this.delaiChangeOutils = delaiChangeOutils; // []
      this.state = state;
      this.bonbon = bonbon;
    }

    checkIsFree() {
      if (this.state === 0)
        return true;
    }

    checkHasVariante(variante) {
      var check = false;
      this.variantes.forEach(function(thisVariante) {
        if (thisVariante === variante)
          check = true;
      });
      return check;
    }

    //todo optimiser production
    launchProduction(commande, con) {
      commande.changeState(1, con);
      var myThis = this;

      var sqlQuantiteCommande = "SELECT * FROM commandes WHERE id = " + commande.id + ";";
      con.query(sqlQuantiteCommande, function(err, results) {
        if (err) throw err;
        if (results.length !== 0) {
          var sqlGetContenant = "SELECT * FROM contenants WHERE id = " + results[0].contenant + ";";
          con.query(sqlGetContenant, function(err1, results1) {
            if (err1) throw err1;
            var sqlGetStock = "SELECT * FROM stock_bonbons " +
              "WHERE bonbon = " + commande.bonbon + " " +
              "AND couleur = " + commande.couleur + " " +
              "AND variante = " + commande.variante + " " +
              "AND texture = " + commande.texture + ";";
            con.query(sqlGetStock, function(err2, results2) {
              if (err2) throw err2;
              if (results2.length !== 0 && (results2[0].quantite >= results[0].quantite * results1[0].max_bonbons)) {
                commande.changeState(2, con);
                myThis.state = 0;
              } else {
                //vérifie si on a besoin de changer d'outils. Si oui, la machine prend le temps de changer d'outils
                if (myThis.bonbon === null || (myThis.bonbon !== null && !(myThis.bonbon.bonbon === commande.bonbon && myThis.bonbon.variante === commande.variante))) {
                  myThis.state = 2;
                  console.log("machine de fabrication " + myThis.id + " change d'outils pendant " + myThis.getDelai(commande.variante) + "ms");
                  setTimeout(function() {
                    myThis.state = 3;
                  }, /*myThis.getDelai(commande.variante)*/ 5000);
                } else {
                  myThis.state = 3;
                }

                var intervalCheckDelaiFinished = setInterval(function() {
                  if (myThis.state === 3) {
                    clearInterval(intervalCheckDelaiFinished);
                    myThis.state = 1;
                    console.log("machine de fabrication " + myThis.id + " commence la production de la commande " + commande.id);

                    setTimeout(function() {
                      myThis.addStock(commande, con, myThis.getCadence(commande.variante));
                      myThis.launchProduction(commande, con);
                    }, /*60 * 60 * 1000*/ 5000);
                  }
                }, 100)
              }
            });
          });
        }
      });

    }

    getDelai(variante) {
      var index;
      for (var i = 0; i < this.variantes.length; i++) {
        if (this.variantes[i] === variante)
          index = i;
      }
      var delai = this.delaiChangeOutils[index];
      return delai * 60 * 1000;
    }

    addStock(commande, con, quantite) {
      var checkStock = "SELECT * FROM stock_bonbons " +
        "WHERE bonbon = " + commande.bonbon + " " +
        "AND couleur = " + commande.couleur + " " +
        "AND variante = " + commande.variante + " " +
        "AND texture = " + commande.texture + ";";
      con.query(checkStock, function(err, results) {
        if (err) throw err;
        if (results.length > 0) {
          var newQuantite = results[0].quantite + quantite;
          var addToExistingStock = "UPDATE stock_bonbons SET quantite = " + newQuantite + " WHERE id = " + results[0].id + ";";
          con.query(addToExistingStock, function(err1, results1) {
            if (err1) throw err1;
            console.log("Stock de " + commande.bonbon+"/"+commande.couleur+"/"+commande.variante+"/"+commande.texture + " modifié de " + results[0].quantite + " à " + newQuantite);
          })
        } else {
          var createStock = "INSERT INTO stock_bonbons(bonbon, couleur, variante, texture, quantite)" +
            "VALUES(" + commande.bonbon + ", " + commande.couleur + ", " + commande.variante + ", " + commande.texture + ", " + quantite + ");";
          con.query(createStock, function(err1, results1) {
            if (err1) throw err1;
            console.log("Nouveau stock de " + commande.bonbon+"/"+commande.couleur+"/"+commande.variante+"/"+commande.texture + " créé avec " + quantite + " de quantité")
          })
        }
      });
    }

    getCadence(variante) {
      for(var i = 0; i < this.variantes.length; i++) {
        if (this.variantes[i] === variante) {
          return this.cadences[i];
        }
      }
    }
  },

  MachineConditionnement: class {
    /*
     machine state :
     - 0 : à l'arret
     - 1 : en marche
     - 2 : changement d'outil
     - 3 : outil changé / machine prete
     */
    constructor(id, contenant, cadence, delaiChangeOutil, state, bonbon) {
      this.id = id;
      this.contenant = contenant;
      this.cadence = cadence;
      this.delaiChangeOutil = delaiChangeOutil;
      this.state = state;
      this.bonbon = bonbon;
    }

    checkIsFree() {
      if (this.state === 0)
        return true;
    }

    launchConditionnement(commande, con) {
      commande.changeState(3, con);
      var myThis = this;
      var quantite;

      var sqlQuantiteCommande = "SELECT * FROM commandes WHERE id = " + commande.id + ";";
      con.query(sqlQuantiteCommande, function(err, results) {
        if (err) throw err;
        if (results.length !== 0) {
          var sqlGetStock = "SELECT * FROM stock_bonbons " +
            "WHERE bonbon = " + commande.bonbon + " " +
            "AND couleur = " + commande.couleur + " " +
            "AND variante = " + commande.variante + " " +
            "AND texture = " + commande.texture + ";";
          con.query(sqlGetStock, function(err1, results1) {
            if (err1) throw err1;
            var sqlGetContenant = "SELECT * FROM contenants WHERE id = " + results[0].contenant + ";";
            con.query(sqlGetContenant, function(err2, results2) {
              if (err2) throw err2;
              quantite = results[0].quantite * results2[0].max_bonbons;
              if ((quantite) <= results1[0].quantite) {
                myThis.removeFromStockBonbons(commande, con, quantite);

                //vérifie si on a besoin de changer d'outils. Si oui, la machine prend le temps de changer d'outils
                if (myThis.bonbon === null || (myThis.bonbon !== null && !(myThis.bonbon.bonbon === commande.bonbon && myThis.bonbon.variante === commande.variante))) {
                  myThis.state = 2;
                  console.log("machine de conditionnement " + myThis.id + " change d'outils pendant " + myThis.delaiChangeOutil + "ms");
                  setTimeout(function() {
                    myThis.state = 3;
                  }, /*myThis.delaiChangeOutil*/ 5000);
                } else {
                  myThis.state = 3;
                }

                var intervalCheckDelaiFinished = setInterval(function() {
                  if (myThis.state === 3) {
                    clearInterval(intervalCheckDelaiFinished);
                    myThis.state = 1;
                    console.log("machine de conditionnement " + myThis.id + " commence la conditionnement");

                    setTimeout(function() {
                      myThis.addStock(commande, con);
                      myThis.state = 0;
                      commande.changeState(4, con);
                    }, /*myThis.calculTime(quantite)*/ 5000);
                  }
                }, 100)
              }
            });
          });
        }
      });
    }

    addStock(commande, con) {
      var checkStock = "SELECT * FROM stock_conditionnement " +
        "WHERE bonbon = " + commande.bonbon + " " +
        "AND couleur = " + commande.couleur + " " +
        "AND variante = " + commande.variante + " " +
        "AND texture = " + commande.texture + " " +
        "AND contenant = " + commande.contenant + ";";
      con.query(checkStock, function(err, results) {
        if (err) throw err;
        if (results.length > 0) {
          var newQuantite = results[0].quantite + commande.quantite;
          var addToExistingStock = "UPDATE stock_conditionnement SET quantite = " + newQuantite + " WHERE id = " + results[0].id + ";";
          con.query(addToExistingStock, function(err1, results1) {
            if (err1) throw err1;
            console.log("Stock de conditionnement de " + commande.bonbon+"/"+commande.couleur+"/"+commande.variante+"/"+commande.texture+"/"+commande.contenant + " modifié de " + results[0].quantite + " à " + newQuantite);
          })
        } else {
          var createStock = "INSERT INTO stock_conditionnement(bonbon, couleur, variante, texture, contenant, quantite) " +
            "VALUES(" + commande.bonbon + ", " + commande.couleur + ", " + commande.variante + ", " + commande.texture + ", " + commande.contenant + ", " + commande.quantite + ");";
          con.query(createStock, function(err1, results1) {
            if (err1) throw err1;
            console.log("Nouveau stock de conditionnement de " + commande.bonbon+"/"+commande.couleur+"/"+commande.variante+"/"+commande.texture+"/"+commande.contenant + " créé avec " + commande.quantite + " de quantité")
          })
        }
      });
    }

    calculTime(quantite) {
      return ((quantite * 60*60*1000) / this.cadence);
    }

    removeFromStockBonbons(commande, con, quantite) {
      var checkStock = "SELECT * FROM stock_bonbons " +
        "WHERE bonbon = " + commande.bonbon + " " +
        "AND couleur = " + commande.couleur + " " +
        "AND variante = " + commande.variante + " " +
        "AND texture = " + commande.texture + ";";
      con.query(checkStock, function(err, results) {
        if (err) throw err;
        if (results.length !== 0) {
          var newQuantite = results[0].quantite - quantite;
          var removeFromExistingStock = "UPDATE stock_bonbons SET quantite = " + newQuantite + " WHERE id = " + results[0].id + ";";
          con.query(removeFromExistingStock, function(err1, results1) {
            if (err1) throw err1;
            console.log("Stock de " + commande.bonbon+"/"+commande.couleur+"/"+commande.variante+"/"+commande.texture + " modifié de " + results[0].quantite + " à " + newQuantite);
          })
        }
      });
    }
  },

  Bonbon: class {
    constructor(bonbon, couleur, variante, texture) {
      this.bonbon = bonbon;
      this.couleur = couleur;
      this.variante = variante;
      this.texture = texture;
    }
  }
};