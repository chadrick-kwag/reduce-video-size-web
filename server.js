const express = require('express')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
var cors = require('cors')
const { spawn } = require('node:child_process');
const port = 10040

const app = express()
app.use(cors())
app.use(express.json())


const filesize_threshold_in_gb = 2

let search_dir_list = [
    "D:\\some\\path"
]


let current_work_process = null
let current_work_outputpath = null
let current_work_inputpath = null
let current_work_start_time = null
let current_work_info = {}

const temp_save_dir = "D:\\temp"

let work_queue = []


const history_file = "history.log"

const add_to_history_log = t => {
    console.log(t)
}

const cleanup_current_work_and_launch_next_in_work_queue = () => {

    console.log("cleanup_current_work_and_launch_next_in_work_queue")

    let remove_index = work_queue.indexOf(current_work_info.input_path)
    if (remove_index === -1) {
        console.log('cannot find index of item to remove')

    }
    else {

        let new_wq = [...work_queue]
        new_wq.splice(remove_index, 1)
        work_queue = new_wq
    }

    current_work_info = {}
    // current_work_inputpath = null
    // current_work_outputpath = null

    if (work_queue.length > 0) {
        let p = work_queue[0]
        launch_process_with_file(p)
    }
}

const launch_process_with_file = p => {

    try {

        // current_work_inputpath = p
        // build output path
        console.log('input p')
        console.log(p)
        let pathobj = path.parse(p)
        let orig_path = path.format(pathobj)
        let outpath = path.join(temp_save_dir, pathobj.base)
        // current_work_outputpath = outpath
        current_work_info.output_path = outpath
        current_work_info.input_path = p
        current_work_info.start_time = new Date()

        // let slashed_p = p.replaceAll('\\', '\\\\')
        let slashed_p = p
        console.log(slashed_p)

        // let slashed_outp = outpath.replaceAll('\\', '\\\\')
        let slashed_outp = outpath
        console.log(slashed_outp)


        let args = [
            "-hwaccel",
            "cuda",
            "-i",
            // `"${slashed_p}"`,
            slashed_p,
            "-vf",
            "scale=720:-2",
            slashed_outp
            // `"${slashed_outp}"`
        ]

        console.log(args)


        current_work_process = spawn('ffmpeg', args)

        current_work_process.stdout.on('data', data => console.log('stdout: ' + data.toString()))
        current_work_process.stderr.on('data', data => console.log(data.toString()))

        current_work_process.on('close', async code => {


            console.log('calling async callback for close')
            console.log(code)

            if (code !== 0) {
                return
            }

            // remove original file and move output file to original path
            await fsp.unlink(current_work_info.input_path)
            console.log('unlink done')

            await fsp.rename(current_work_info.output_path, current_work_info.input_path)
            console.log('rename done')

            // todo: save finished log to history
            cleanup_current_work_and_launch_next_in_work_queue()

        })

        current_work_process.on('error', async err => {
            console.log(`error: ${err}`)

            cleanup_current_work_and_launch_next_in_work_queue()
        })

    }
    catch (e) {
        console.log('error while trying to launch job')
        console.log(e)
        current_work_info = {}
    }

}

const add_to_work_queue = (p) => {
    work_queue.push(p)
    if (work_queue.length === 1) {
        // launch job
        launch_process_with_file(p)
    }
}

const get_files_in_dir = d => {
    let sub_files = fs.readdirSync(d, { withFileTypes: true })
    let files = []

    for (let i = 0; i < sub_files.length; i++) {
        let a = sub_files[i]
        if (a.isFile()) {

            files.push(path.join(d, a.name))

            continue
        }
        if (a.isDirectory()) {
            console.log(a)
            let p = path.join(d, a.name)
            console.log(p)
            let files_in_dir = get_files_in_dir(p)
            files = [...files, ...files_in_dir]
            continue
        }
    }

    return files
}



const filter_files_to_watch = flist => {
    let files_to_watch = []

    for (let i = 0; i < flist.length; i++) {
        let f = flist[i]
        let stats = fs.statSync(f)
        let gb_size = stats.size / (1024 * 1024 * 1024)

        if (gb_size > filesize_threshold_in_gb) { files_to_watch.push(f) }

    }

    return files_to_watch
}

let all_files = []
for (let i = 0; i < search_dir_list.length; i++) {
    let d = search_dir_list[i]
    all_files = [...all_files, ...get_files_in_dir(d)]
}

all_files = filter_files_to_watch(all_files)
console.log(all_files)


app.get('/', (req, res) => {
    res.send('hello world')
})

app.get('/get_files', (req, res) => {
    console.log('/get_files called')
    res.json({
        success: true,
        msg: "something",
        data: all_files
    })
})

app.get('/get_watch_dirs', (req, res) => {
    res.json({
        success: true,
        data: search_dir_list
    })
})

app.post('/add_to_wq', (req, res) => {
    console.log(req.body)

    let work_path = req.body.path
    console.log(work_path)

    // check if already in wq
    if (work_queue.includes(work_path)) {
        console.log('already in work queue')
        return res.json({
            success: false,
            msg: 'already in work queue'
        })
    }

    if (!fs.existsSync(work_path)) {
        console.log(`${work_path} not exist`)
        return res.json({
            success: false,
            msg: 'path not exist'
        })
    }

    if (!fs.statSync(work_path).isFile()) {
        console.log(`${work_path} is not a file`)
        return res.json({
            success: false,
            msg: 'path is not a file'
        })
    }

    // todo : need to check if path exists
    add_to_work_queue(work_path)

    return res.json({
        success: true
    })


})

app.get('/work_queue_status', (req, res) => {
    console.log(work_queue)
    res.json({
        success: true,
        data: {
            queue: work_queue,
            current_work_info: current_work_info
            // current_processing_filepath: current_work_inputpath
        }
    })
})

app.listen(port, () => {
    console.log(`app listening on port: ${port}`)
})


