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
    constructor(bonbon, couleur, variante, texture, contenant, quantite, pays, etat) {
      this.bonbon = bonbon;
      this.couleur = couleur;
      this.variante = variante;
      this.texture = texture;
      this.contenant = contenant;
      this.quantite = quantite;
      this.pays = pays;
      this.etat = etat;
    }
  },

  MachineFabric: class {
    /*
    machine state :
    - 0 : à l'arret
    - 1 : en marche
    - 2 : changement d'outil
     */
    constructor(id, variantes, cadences, delaiChangeOutils, state, bonbon) {
      this.id = id;
      this.variantes = variantes; // []
      this.cadences = cadences; // []
      this.delaiChangeOutils = delaiChangeOutils; // []
      this.state = state;
      this.bonbon = bonbon;
    }


  }


};