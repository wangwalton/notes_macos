const a = async () => {


    try {
        await fetch("http://localhost:57193")
    } catch (e) {
        console.log(e)

    }

}


a()
//
//
// let currentWorkSession = null;
// console.log(currentWorkSession?.id === undefined)
//
// currentWorkSession = {};
// console.log(currentWorkSession?.id === undefined)
//
// currentWorkSession = {id: undefined};
// console.log(currentWorkSession?.id === undefined)