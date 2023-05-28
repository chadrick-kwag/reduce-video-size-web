import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import './custom_css.css'

const DATA_HOST = "http://localhost:10040"

function App() {

    const [workFiles, setWorkFiles] = useState(null)
    const [watchDirList, setWatchDirList] = useState(null)
    const [workQueueStatus, setWorkQueueStatus] = useState(null)




    const fetch_work_queue = () => {

        let url = DATA_HOST + '/work_queue_status'
        fetch(url).then(res => res.json()).then(data => {
            console.log(data)
            if (data?.success) {
                setWorkQueueStatus(data?.data)
            }
        })


    }

    const fetch_possible_files = ()=>{

        let url = DATA_HOST + '/get_files'
        fetch(url).then(res => res.json()).then(data => {
            console.log(data)
            if (data?.success) {
                setWorkFiles(data?.data)
            }
        }).catch(e => {
            console.log(e)
        })
    }

    const FETCH_INTERVAL_MS = 1000 

    useEffect(() => {
        // fetch work files
        fetch_possible_files()

        let url = DATA_HOST + '/get_watch_dirs'
        fetch(url).then(res => res.json()).then(data => {
            console.log(data)
            if (data?.success) {
                setWatchDirList(data?.data)
            }
        })

        fetch_work_queue()

        // add periodic caller
        const wq_interval = setInterval(()=>{
            fetch_work_queue()
        }, FETCH_INTERVAL_MS)

        return ()=>clearInterval(wq_interval)
    }, [])


    const request_add_file_to_wq = p => {
        let url = DATA_HOST + '/add_to_wq'
        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: p
            })
        }).catch(e => {
            console.log(e)
        })
    }


    return <Container>
        <div>
            <div className="section-header">
                <h1>work queue</h1> <RefreshIcon onClick={() => {
                    setWorkQueueStatus(null)
                    fetch_work_queue()
                }} />
            </div>
            <div>
                {workQueueStatus === null ? <CircularProgress /> :
                    (
                        workQueueStatus.queue.length === 0 ? <span>empty work queue</span> : workQueueStatus.queue.map(a => {
                            let is_being_processed = a===workQueueStatus?.current_work_info?.input_path
                        return <div>{a} {is_being_processed ? <CircularProgress/> : null}</div>})
                    )

                }
            </div>
        </div>

        <div>
            <div className="section-header">
                <h1>watch directories</h1> <RefreshIcon />
            </div>
            <div>
                {watchDirList === null ? <CircularProgress /> :
                    watchDirList.map(a => <div>{a}</div>)
                }
            </div>
        </div>
        <div>
            <div className="section-header">
                <h1>possible files</h1>
                <RefreshIcon onClick={()=>fetch_possible_files()}/>
            </div>
            <div>
                {workFiles === null ? <CircularProgress /> : (
                    workFiles.length === 0 ? <span>no files</span> : workFiles.map(a => <div>{a} <AddIcon onClick={() => {
                        request_add_file_to_wq(a)
                    }} /></div>)
                )}
            </div>
        </div>
    </Container>
}

ReactDOM.render(<App />, document.getElementById('app'))

