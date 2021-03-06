import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

// Defining our Posts collection

Teams = new Mongo.Collection('teams');

// Ensure index
Meteor.startup(function () {
    if (Meteor.isServer) {
        Teams._ensureIndex({ "name": 1});
    }
});

let checkForAdmin = function() {
    if (!Meteor.userId) {
        throw new Meteor.Error(400, 'You must be logged in');
    }
    else if (Meteor.user().roles.indexOf('admin') < 0) {
        throw new Meteor.Error(400, 'You do not have permission to do that!');
    }
};

Meteor.methods({
    teamCreate(team) {

        check(Meteor.userId(), String);
        check(team, {
            name: String,
            password: String,
        });

        let user = Meteor.user();
        let date = new Date();

        team.name = team.name.trim();
        team = _.extend(team, {
            owner: user._id,
            created: date,
            updated: date,
            members: [user._id],
            destination: ''
        });

        // Check for existing team name
        let existingTeam = Teams.findOne({name: team.name});
        if (existingTeam) {
            throw new Meteor.Error(400, 'A team with that name already exists!');
        }

        // Create the team
        let newTeamId = Teams.insert(team, (err) => {
            if (err) {
                throw new Meteor.Error(err.reason);
            }
        });

        // Update the team owner's teamId.
        // Only execute on the server
        if (Meteor.isServer) {
            Meteor.users.update(user._id, {$set: {'profile.teamId': newTeamId}});
        }

        return {
            _id: newTeamId
        };
    },

    teamUpdate(fields) {
        check(Meteor.userId(), String);
        check(fields, {
            name: String,
            password: String,
            teamId: String
        });

        let user = Meteor.user();
        let team = Teams.findOne({_id: fields.teamId});

        if (!team) {
            throw new Meteor.Error(400, 'No team found');
        }
        else if (team.owner !== user._id) {
            throw new Meteor.Error(400, 'You don\'t own that team');
        }

        // Team is good, and current user owns it.
        // Update team.

        if (Meteor.isServer) {
            Teams.update({_id: team._id}, {$set: {name: fields.name, password: fields.password}});
        }
    },

    teamJoin(fields) {
        check(Meteor.userId(), String);
        check(fields, {
            password: String,
            teamId: String
        });

        let user = Meteor.user();

        let team = Teams.findOne({_id: fields.teamId});
        if (!team) {
            throw new Meteor.Error(400, 'No Team with that Id!');
        }
        else if (team.members.length >= 6) {
            throw new Meteor.Error(400, 'Sorry this team is full!');
        }
        else if (Meteor.isServer && fields.password !== team.password) {
            throw new Meteor.Error(400, 'Incorrect password');
        }

        // Got team and password is good:
        // Add user to team.
        if (Meteor.isServer) {
            team.members.push(user._id);
            Teams.update({_id: team._id}, {$set: {members: team.members}});
            Meteor.users.update({_id: user._id}, {$set: {'profile.teamId': team._id}});
        }
    },

    teamLeave() {
        check(Meteor.userId(), String);

        let team = Teams.findOne({"members": Meteor.userId()});

        if (team.members.length == 1){ 
            
            // If you are the last person to leave remove your team
            Teams.remove({_id:team._id});
        }
        else {
            Teams.update({_id:team._id}, {
                $pull: {
                members: Meteor.userId(),
            }
        });
        team = Teams.findOne({_id: team._id});
        if (team.owner == Meteor.userId()) {
            
            // If you were the owner Promote someone
            Teams.update({_id:team._id}, {$set:{
                owner: team.members[0]
            }});
            
            // Email new team owner to let them know they are the new owner.
            let newOwner = Meteor.users.findOne({_id: team.members[0]});
            
            Email.send({
                to: newOwner.emails[0].address,
                from: "WWU Puzzle Hunt <accounts@wwupuzzlehunt.com>",
                subject: `You are the new owner of ${team.name}!`,
                html: `Hi ${newOwner.profile.firstname},\n\nWe are writing to let you know that your team owner left and you have been randomly selected as the new team owner!\nThis means that you are able to set the team password on the team page.\n\n Happy puzzle hunting!`
            });
        }
      }
      Meteor.users.update({_id:Meteor.userId()}, {$set:{
        "profile.teamId": null
      }});
    },

    teamsAdminAssignDestinations() {
        check(this.userId, String);
        let user = Meteor.users.findOne({_id: this.userId});
        if (user.roles.indexOf('admin') < 0)
            throw new Meteor.Error(403, 'You are not allowed to do that!');

        let puzzles = PuzzleCollection.find({}).fetch();
        let numPuzzles = puzzles.length;

        if (numPuzzles < 1) {
            throw new Meteor.Error(400, 'There are no puzzles!');
        }
        let teams = Teams.find({}).fetch();
        
        let locations = puzzles.map((puzzle) => {
            return `${puzzle.name}: ${puzzle.location}`;
        });

        for (let i = 0; i < teams.length; i++) {
            Teams.update({_id: teams[i]._id}, {$set: {destination: locations[i % numPuzzles]}});
        }
        return true;
    }

});
